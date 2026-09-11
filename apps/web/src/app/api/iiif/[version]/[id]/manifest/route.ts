/**
 * IIIF Presentation API manifest generator for Morrison items.
 *
 * GET /api/iiif/:version/:id/manifest   (id = callNumber)
 *
 * Metadata comes from the morrison_bib ES index. Pages and their sizes come
 * from src/data/page-dims.json, a scan of the PTIFs on the Toyo Bunko image
 * server img.toyobunko-lab.jp (identifier
 * `morrison_p/<group>/<callNumber>/<NNNN>.tif`), plus a short probe past the
 * last scanned page. No Omeka — the legacy `/api/media` dependency is gone.
 *
 * Items with no images on the image server yield zero canvases → 404.
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
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { FULL_SIZE, imageServiceUrl } from '@/libs/iiif-image'
import { listPages, type PageRuns } from '@/libs/manifest-pages'
import pageDims from '@/data/page-dims.json'

export const revalidate = 3600

const INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

/** Image-server scan by scripts/build-page-dims.py (see libs/manifest-pages). */
const KNOWN_PAGES = (pageDims as unknown as { items: Record<string, PageRuns> }).items

/** Fetch the image server's info.json; returns dims when the page exists, else null. */
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

/**
 * v2 -> v3 変換で壊れた画像 URL を直す。
 *
 * IIIF Image API の識別子にスラッシュが含まれる場合、URL では %2F と
 * 1 回だけエンコードする (例: morrison_p%2FP-III%2F...%2F0001.tif)。
 * ところが @iiif/parser の convertPresentation2 は annotation body の
 * id をもう一度エンコードしてしまい、%2F が %252F になる。
 * その結果、画像そのものの URL が 404 を返す。
 *
 * 変換後も service 側の id は正しいままなので、それを手がかりに
 * 「二重エンコードされていて、かつ 1 段戻すと service の id で始まる」
 * ものだけを直す。判断できないものには触れない。
 */
function repairDoubleEncodedIds(manifest: unknown): unknown {
  const asArray = (v: unknown): unknown[] =>
    Array.isArray(v) ? v : v == null ? [] : [v]

  const idOf = (v: unknown): string | undefined => {
    if (typeof v !== 'object' || v === null) return undefined
    const o = v as Record<string, unknown>
    const id = o.id ?? o['@id']
    return typeof id === 'string' ? id : undefined
  }

  const repair = (target: unknown, serviceId: string): void => {
    if (typeof target !== 'object' || target === null) return
    const o = target as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id.includes('%25')) return
    const decoded = o.id.replace(/%25/g, '%')
    if (decoded.startsWith(serviceId)) o.id = decoded
  }

  for (const canvas of asArray((manifest as Record<string, unknown>)?.items)) {
    for (const page of asArray((canvas as Record<string, unknown>)?.items)) {
      for (const anno of asArray((page as Record<string, unknown>)?.items)) {
        const body = (anno as Record<string, unknown>)?.body
        const serviceId = asArray((body as Record<string, unknown>)?.service)
          .map(idOf)
          .find((v): v is string => typeof v === 'string')
        if (!serviceId) continue
        repair(body, serviceId)
        for (const thumb of asArray((canvas as Record<string, unknown>)?.thumbnail)) {
          repair(thumb, serviceId)
        }
      }
    }
  }
  return manifest
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string; id: string }> },
) {
  // Repeat requests come from Cloudflare's cache (per data center, for the
  // s-maxage in createIIIFHeaders). Absent outside the Worker runtime.
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default
  const cacheKey = new Request(request.url)
  const cached = await cache?.match(cacheKey)
  if (cached) return cached

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

  // Pages from the image-server scan, plus any added past its last page.
  const pages = await listPages(KNOWN_PAGES[callNumber], page =>
    probeIIIF(imageServiceUrl(callNumber, page)),
  )

  const canvases: IIIFCanvasImage[] = pages.map(({ page, width, height }) => {
    const serviceUrl = imageServiceUrl(callNumber, page)
    return {
      imageUrl: `${serviceUrl}/full/${FULL_SIZE}/0/default.jpg`,
      serviceUrl,
      width,
      height,
      format: 'image/jpeg',
      thumbnailUrl: `${serviceUrl}/full/!200,200/0/default.jpg`,
    }
  })

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

  let body = JSON.stringify(manifest)

  // v3 conversion
  if (version === '3') {
    try {
      const { convertPresentation2 } = await import('@iiif/parser/presentation-2')
      body = JSON.stringify(repairDoubleEncodedIds(convertPresentation2(manifest)))
    } catch {
      // Fallback to v2 if parser not available
    }
  }

  const response = new Response(body, { headers: createIIIFHeaders() })
  if (cache) {
    const put = cache.put(cacheKey, response.clone())
    try {
      getCloudflareContext().ctx.waitUntil(put)
    } catch {
      await put
    }
  }
  return response
}
