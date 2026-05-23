/**
 * IIIF Presentation API manifest generator for Morrison items
 *
 * GET /api/iiif/:version/:id/manifest
 *
 * Supports both v2 and v3 (with @iiif/parser conversion).
 * Fetches item metadata from morrison_bib index, then media from Omeka S API.
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

const OMEKA_BASE_URL = process.env.OMEKA_BASE_URL || ''
const OMEKA_USER = process.env.OMEKA_USER || ''
const OMEKA_PASSWORD = process.env.OMEKA_PASSWORD || ''
const INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

// Clean PTIF served from s3ds via Cantaloupe (media.toyobunko-lab.jp). The
// migration target: identifier `morrison_p/<group>/<callNumber>/<NNNN>.tif`
// (PATH_PREFIX=files/ on the server). This is the preferred image source.
const MEDIA_BASE = (process.env.MORRISON_MEDIA_IIIF_BASE || 'https://media.toyobunko-lab.jp/iiif/3').replace(/\/+$/, '')

// Legacy live Cantaloupe (Azure-backed). Full coverage during migration;
// used as fallback for items not yet converted to clean PTIF.
const MO_IMG_BASE = (process.env.MORRISON_IIIF_BASE || 'https://mo-img.aws.ldas.jp/iiif/3').replace(/\/+$/, '')

/**
 * Group folder = the first two hyphen-segments of the callNumber
 * (`P-III-a-0083` → `P-III`). Mirrors the s3ds clean key layout
 * `files/morrison_p/<group>/<callNumber>/<NNNN>.tif`.
 */
function deriveGroup(callNumber: string): string {
  return callNumber.split('-').slice(0, 2).join('-')
}

/**
 * Page number from a media `o:source` filename (`..._0001.jpg` → 1). The clean
 * PTIF keys preserve this source page number (zero-padded to 4), so it — not
 * the media list index — is what addresses a page on media.
 */
function pageFromSource(source: string): number | null {
  const m = decodeURIComponent(source).match(/_(\d+)\.(?:jpe?g|tiff?)/i)
  return m ? parseInt(m[1], 10) : null
}

/** media. (clean PTIF) IIIF service URL. Page is zero-padded to 4 digits. */
function mediaServiceUrl(group: string, callNumber: string, page: number): string {
  const ident = `morrison_p/${group}/${callNumber}/${String(page).padStart(4, '0')}.tif`
  return `${MEDIA_BASE}/${encodeURIComponent(ident)}`
}

/**
 * Legacy mo-img service URL. `pad` is the zero-pad width (4 or 3 in legacy
 * folders); identifier `<group>/<callNumber>/<callNumber>_<NNNN>.jpg`.
 */
function moImgServiceUrl(group: string, callNumber: string, page: number, pad: number): string {
  const ident = `${group}/${callNumber}/${callNumber}_${String(page).padStart(pad, '0')}.jpg`
  return `${MO_IMG_BASE}/${encodeURIComponent(ident)}`
}

/** Fetch a Cantaloupe info.json; returns dims when it exists, else null. */
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

interface OmekaMedia {
  'o:id': number
  'o:media_type'?: string
  'o:original_url'?: string
  'o:source'?: string
  thumbnail_display_urls?: {
    large?: string
    medium?: string
    square?: string
  }
  data?: {
    dimensions?: {
      original?: { width: number; height: number }
    }
  }
}

function createOmekaHeaders(): Record<string, string> {
  if (OMEKA_USER && OMEKA_PASSWORD) {
    const auth = Buffer.from(`${OMEKA_USER}:${OMEKA_PASSWORD}`).toString('base64')
    return { Authorization: `Basic ${auth}` }
  }
  return {}
}

async function fetchMediaFromOmeka(omekaId: number): Promise<OmekaMedia[]> {
  const allMedia: OmekaMedia[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const url = `${OMEKA_BASE_URL}/api/media?item_id=${omekaId}&per_page=${perPage}&page=${page}&sort_by=id&sort_order=asc`
    const response = await fetch(url, {
      headers: createOmekaHeaders(),
      next: { revalidate: 3600 },
    })

    if (!response.ok) break

    const media: OmekaMedia[] = await response.json()
    if (media.length === 0) break

    allMedia.push(...media)
    if (media.length < perPage) break
    page++
  }

  return allMedia
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string; id: string }> },
) {
  ensureEnv()
  const { version, id } = await params
  const host = getHost(request)
  const prefix = `${host}/api/iiif/${version}/${id}`

  // Fetch item from ES (ID is callNumber)
  const data = await esSearch(INDEX_NAME, {
    query: { ids: { values: [id] } },
    size: 1,
  })

  const item = data.hits.hits[0]?._source
  if (!item || !item.omeka_id) {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: createIIIFHeaders(),
    })
  }

  // Fetch media from Omeka S
  const mediaList = await fetchMediaFromOmeka(item.omeka_id as number)
  // Include both regular images (o:media_type=image/*) and IIIF images (source contains /iiif/)
  const imageMedia = mediaList.filter(m =>
    m['o:media_type']?.startsWith('image/') ||
    m['o:source']?.includes('/iiif/')
  )

  if (imageMedia.length === 0) {
    return new Response(JSON.stringify({ error: 'No images found' }), {
      status: 404,
      headers: createIIIFHeaders(),
    })
  }

  // Image source resolution (migration in progress):
  //   1. media.toyobunko-lab.jp — clean PTIF on s3ds (preferred, real tiles)
  //   2. mo-img.aws.ldas.jp     — legacy Cantaloupe (Azure), full coverage
  //   3. Omeka static JPEG       — last resort (no IIIF service → no tiling)
  // Probe page 1 of each source to gate per-page resolution. The clean PTIF
  // page = the source filename's page number (preserved on conversion).
  const callNumber = (item.callNumber as string) || id
  const group = deriveGroup(callNumber)

  const firstPage = pageFromSource(imageMedia[0]?.['o:source'] || '') ?? 1
  const mediaFirstDims = await probeIIIF(mediaServiceUrl(group, callNumber, firstPage))
  const useMedia = mediaFirstDims !== null

  let moImgPad: number | null = null
  let moImgFirstDims: { width: number; height: number } | null = null
  if (!useMedia) {
    for (const pad of [4, 3]) {
      const dims = await probeIIIF(moImgServiceUrl(group, callNumber, 1, pad))
      if (dims) {
        moImgPad = pad
        moImgFirstDims = dims
        break
      }
    }
  }

  const canvases: IIIFCanvasImage[] = await Promise.all(
    imageMedia.map(async (media, idx) => {
      const source = media['o:source'] || ''

      // 1. Clean PTIF via media. (s3ds).
      if (useMedia) {
        const page = pageFromSource(source) ?? idx + 1
        const serviceUrl = mediaServiceUrl(group, callNumber, page)
        const dims =
          (idx === 0 ? mediaFirstDims : await probeIIIF(serviceUrl)) ||
          media.data?.dimensions?.original || { width: 1000, height: 1000 }
        return {
          imageUrl: `${serviceUrl}/full/max/0/default.jpg`,
          serviceUrl,
          width: dims.width,
          height: dims.height,
          format: 'image/jpeg',
          thumbnailUrl: `${serviceUrl}/full/!200,200/0/default.jpg`,
        }
      }

      const isIIIF = source.includes('/iiif/')

      // 2a. Media already exposed as an IIIF Image API source (mo-img).
      if (isIIIF) {
        const serviceUrl = source.replace('/info.json', '')
        let width = 1000
        let height = 1000

        try {
          const infoRes = await fetch(source, { next: { revalidate: 86400 } })
          if (infoRes.ok) {
            const info = await infoRes.json()
            width = info.width || 1000
            height = info.height || 1000
          }
        } catch {
          // fallback to default dimensions
        }

        return {
          imageUrl: `${serviceUrl}/full/max/0/default.jpg`,
          serviceUrl,
          width,
          height,
          format: 'image/jpeg',
          thumbnailUrl: media.thumbnail_display_urls?.medium || `${serviceUrl}/full/!200,200/0/default.jpg`,
        }
      }

      // 2b. Static media resolvable on the legacy mo-img Cantaloupe.
      if (moImgPad !== null) {
        const serviceUrl = moImgServiceUrl(group, callNumber, idx + 1, moImgPad)
        const dims = idx === 0 ? moImgFirstDims : await probeIIIF(serviceUrl)
        if (dims) {
          return {
            imageUrl: `${serviceUrl}/full/max/0/default.jpg`,
            serviceUrl,
            width: dims.width,
            height: dims.height,
            format: 'image/jpeg',
            thumbnailUrl: media.thumbnail_display_urls?.medium || `${serviceUrl}/full/!200,200/0/default.jpg`,
          }
        }
      }

      // 3. Omeka static JPEG (no IIIF service → no tiling).
      const dims = media.data?.dimensions?.original || { width: 1000, height: 1000 }
      return {
        imageUrl: media['o:original_url'] || '',
        width: dims.width,
        height: dims.height,
        format: 'image/jpeg',
        thumbnailUrl: media.thumbnail_display_urls?.medium || '',
      }
    }),
  )

  // Build metadata
  const metadata: { label: string; value: string }[] = []
  if (item.heading1) metadata.push({ label: '著者 / Author', value: item.heading1 as string })
  if (item.publication) metadata.push({ label: '出版 / Publication', value: item.publication as string })
  if (item.callNumber) metadata.push({ label: '請求記号 / Call Number', value: item.callNumber as string })
  if (item.tag1) metadata.push({ label: '分類 / Classification', value: item.tag1 as string })
  if (item.description) metadata.push({ label: '説明 / Description', value: item.description as string })

  // Build search service URL (content search via existing morrison OCR index)
  const searchServiceUrl = `${host}/api/iiif-search/1/${id}`

  // Check if any canvas has IIIF Image service
  const hasAnyImageService = canvases.some(c => !!c.serviceUrl)

  const manifest = buildManifestV2({
    id: `${prefix}/manifest`,
    label: (item.title as string) || id,
    prefix,
    canvases,
    metadata,
    searchServiceUrl,
    viewingDirection: 'left-to-right',
    hasImageService: hasAnyImageService,
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
