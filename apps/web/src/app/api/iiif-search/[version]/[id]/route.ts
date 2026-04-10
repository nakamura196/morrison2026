/**
 * IIIF Content Search API for Morrison items
 *
 * GET /api/iiif-search/:version/:id?q=keyword
 *
 * Searches the existing 'morrison' OCR index for matching pages
 * and returns results as IIIF Annotation List.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getHost,
  esSearch,
  buildAnnotationList,
  type IIIFAnnotation,
} from '@toyo/shared-lib'

export const revalidate = 3600

const OCR_INDEX = process.env.FULLTEXT_INDEX_NAME || 'morrison'
const BIB_INDEX = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  const { id, version } = await params
  const host = getHost(request)
  const prefix = `${host}/api/iiif-search/${version}/${id}`

  const q = request.nextUrl.searchParams.get('q')

  if (!q) {
    const response = buildAnnotationList(prefix, [])
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }

  // Look up the omeka_id from the bib index (ID is now callNumber)
  const bibData = await esSearch(BIB_INDEX, {
    query: { ids: { values: [id] } },
    size: 1,
    _source: ['omeka_id'],
  })
  const bibItem = bibData.hits.hits[0]?._source
  if (!bibItem?.omeka_id) {
    const response = buildAnnotationList(prefix, [])
    return NextResponse.json(response)
  }
  const omekaId = String(bibItem.omeka_id)

  // Search the morrison OCR index for matching pages
  const data = await esSearch(OCR_INDEX, {
    query: {
      bool: {
        must: [
          { term: { item_id: omekaId } },
          {
            match_phrase: {
              text: q,
            },
          },
        ],
      },
    },
    size: 10000,
    _source: ['page', 'text'],
    highlight: {
      fields: {
        text: {
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
          fragment_size: 100,
          number_of_fragments: 3,
        },
      },
    },
  })

  const annotations: IIIFAnnotation[] = []

  for (const hit of data.hits.hits) {
    const pageNum = hit._source.page as number
    // Canvas IDs are 1-indexed based on media order
    // The page field in the OCR index corresponds to media order
    const canvasId = `${host}/api/iiif/2/${id}/canvas/p${pageNum}`

    const highlights = (hit as Record<string, unknown> & {
      highlight?: { text?: string[] }
    }).highlight?.text || []
    const chars = highlights.length > 0
      ? highlights.join(' ... ')
      : (hit._source.text as string).substring(0, 200)

    annotations.push({
      '@id': `${canvasId}#search-hit`,
      '@type': 'oa:Annotation',
      motivation: 'sc:painting',
      resource: {
        '@type': 'cnt:ContentAsText',
        chars,
      },
      on: canvasId,
    })
  }

  const response = buildAnnotationList(`${prefix}?q=${q}`, annotations)

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
