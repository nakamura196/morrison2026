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

export const revalidate = 3600

const OMEKA_BASE_URL = process.env.OMEKA_BASE_URL || ''
const OMEKA_USER = process.env.OMEKA_USER || ''
const OMEKA_PASSWORD = process.env.OMEKA_PASSWORD || ''
const INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

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

  // Fetch dimensions from IIIF Image API info.json for media that lack local dimensions
  const canvases: IIIFCanvasImage[] = await Promise.all(
    imageMedia.map(async (media) => {
      const source = media['o:source'] || ''
      const isIIIF = source.includes('/iiif/')

      if (isIIIF) {
        // IIIF Image API: source is info.json URL
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
      } else {
        // Static image from Omeka S
        const dims = media.data?.dimensions?.original || { width: 1000, height: 1000 }
        return {
          imageUrl: media['o:original_url'] || '',
          width: dims.width,
          height: dims.height,
          format: 'image/jpeg',
          thumbnailUrl: media.thumbnail_display_urls?.medium || '',
        }
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
