/**
 * IIIF Presentation API manifest generator for Morrison items.
 *
 * GET /api/iiif/:version/:id/manifest   (id = callNumber)
 *
 * Metadata comes from the morrison_bib ES index. Pages are enumerated by
 * probing the clean PTIF served from s3ds via media.toyobunko-lab.jp
 * (identifier `morrison_p/<group>/<callNumber>/<NNNN>.tif`). No Omeka — the
 * legacy `/api/media` dependency is gone, so the manifest no longer needs the
 * (now auth-gated, being-decommissioned) Omeka instance.
 *
 * Items not yet converted to clean PTIF (image migration in progress) yield
 * zero canvases → 404, and start working as the conversion reaches them.
 */

import { NextRequest } from 'next/server'
import {
  getHost,
  esSearch,
  buildManifestV2,
  createIIIFHeaders,
  type IIIFCanvasImage,
} from '@toyo/shared-lib'
import { ensureEnv } from '@/libs/cf-env'

export const revalidate = 3600

const INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

// Clean PTIF on s3ds, served by Cantaloupe via media.toyobunko-lab.jp.
// PATH_PREFIX=files/ on the server, so the identifier is
// `morrison_p/<group>/<callNumber>/<NNNN>.tif`.
const MEDIA_BASE = (process.env.MORRISON_MEDIA_IIIF_BASE || 'https://media.toyobunko-lab.jp/iiif/3').replace(/\/+$/, '')

// Page enumeration: probe pages concurrently in batches, stop when a whole
// batch is absent. Gaps smaller than the batch are tolerated.
const PROBE_BATCH = 8
const MAX_PAGES = 800

/** Group folder = first two hyphen-segments of the callNumber (`P-III-a-0083` → `P-III`). */
function deriveGroup(callNumber: string): string {
  return callNumber.split('-').slice(0, 2).join('-')
}

/** media. (clean PTIF) IIIF service URL for one page (zero-padded to 4). */
function mediaServiceUrl(group: string, callNumber: string, page: number): string {
  const ident = `morrison_p/${group}/${callNumber}/${String(page).padStart(4, '0')}.tif`
  return `${MEDIA_BASE}/${encodeURIComponent(ident)}`
}

/** Fetch a Cantaloupe info.json; returns dims when the page exists, else null. */
async function probeIIIF(serviceUrl: string): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(`${serviceUrl}/info.json`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const info = (await res.json()) as { width?: number; height?: number }
    if (!info?.width || !info?.height) return null
    return { width: info.width, height: info.height }
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string; id: string }> },
) {
  ensureEnv()
  const { version, id } = await params
  const host = getHost(request)
  const prefix = `${host}/api/iiif/${version}/${id}`

  // Item metadata from ES (ID is callNumber)
  const data = await esSearch(INDEX_NAME, {
    query: { ids: { values: [id] } },
    size: 1,
  })

  const item = data.hits.hits[0]?._source
  if (!item) {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: createIIIFHeaders(),
    })
  }

  const callNumber = (item.callNumber as string) || id
  const group = deriveGroup(callNumber)

  // Enumerate pages from the clean PTIF on media. in concurrent batches.
  const canvases: IIIFCanvasImage[] = []
  for (let start = 1; start <= MAX_PAGES; start += PROBE_BATCH) {
    const batch = await Promise.all(
      Array.from({ length: PROBE_BATCH }, (_, k) => {
        const serviceUrl = mediaServiceUrl(group, callNumber, start + k)
        return probeIIIF(serviceUrl).then(dims => ({ serviceUrl, dims }))
      }),
    )
    let any = false
    for (const b of batch) {
      if (!b.dims) continue
      any = true
      canvases.push({
        imageUrl: `${b.serviceUrl}/full/max/0/default.jpg`,
        serviceUrl: b.serviceUrl,
        width: b.dims.width,
        height: b.dims.height,
        format: 'image/jpeg',
        thumbnailUrl: `${b.serviceUrl}/full/!200,200/0/default.jpg`,
      })
    }
    if (!any) break
  }

  if (canvases.length === 0) {
    // Not yet converted (or no images). Becomes available as conversion reaches it.
    return new Response(JSON.stringify({ error: 'No images found' }), {
      status: 404,
      headers: createIIIFHeaders(),
    })
  }

  // Build metadata
  const metadata: { label: string; value: string }[] = []
  if (item.heading1) metadata.push({ label: '著者 / Author', value: item.heading1 as string })
  if (item.publication) metadata.push({ label: '出版 / Publication', value: item.publication as string })
  if (item.callNumber) metadata.push({ label: '請求記号 / Call Number', value: item.callNumber as string })
  if (item.tag1) metadata.push({ label: '分類 / Classification', value: item.tag1 as string })
  if (item.description) metadata.push({ label: '説明 / Description', value: item.description as string })

  // Content search service (existing OCR index)
  const searchServiceUrl = `${host}/api/iiif-search/1/${id}`

  // Items with OCR/transcription text get a per-canvas annotation list (text
  // layer), served as Presentation 3. Only wire it into the v3 manifest — the
  // text-layer endpoint is v3-only, so a v2 manifest must not reference it.
  // (The internal viewer fetches the v2 manifest purely for image service IDs.)
  // Pages without text simply yield an empty AnnotationPage.
  const hasAnnotations = version === '3' && item.has_fulltext === true

  const manifest = buildManifestV2({
    id: `${prefix}/manifest`,
    label: (item.title as string) || id,
    prefix,
    canvases,
    metadata,
    searchServiceUrl,
    viewingDirection: 'left-to-right',
    hasImageService: true,
    hasAnnotations,
  })

  // v3 conversion
  if (version === '3') {
    try {
      const { convertPresentation2 } = await import('@iiif/parser/presentation-2')
      const converted = convertPresentation2(manifest)
      return new Response(JSON.stringify(converted), { headers: createIIIFHeaders() })
    } catch {
      // Fallback to v2 if parser not available
    }
  }

  return new Response(JSON.stringify(manifest), { headers: createIIIFHeaders() })
}
