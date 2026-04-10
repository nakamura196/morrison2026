/**
 * Fulltext search API for Morrison OCR pages
 *
 * POST /api/fulltext-search
 *
 * Searches the `morrison` index (page-level OCR text) and enriches
 * results with item metadata from `morrison_bib`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { esSearch } from '@toyo/shared-lib'

const INDEX_NAME = process.env.FULLTEXT_INDEX_NAME || 'morrison'
const BIB_INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

interface SearchFilter {
  field: string
  values: (string | number | boolean)[]
  type?: string
}

interface SearchState {
  searchTerm?: string
  current?: number
  resultsPerPage?: number
  filters?: SearchFilter[]
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

interface PageHit {
  _id: string
  _source: {
    item_id: string
    page: string
    title?: string
    text?: string
  }
  highlight?: {
    text?: string[]
  }
}

interface BibDoc {
  _id: string // callNumber (new ID scheme)
  _source: {
    title?: string
    heading1?: string
    tag1?: string
    publication_year?: string
    thumbnail_urls?: { small?: string; medium?: string; large?: string }
    omeka_id?: number
    has_image?: boolean
    callNumber?: string
  }
}

function buildSearchQuery(
  searchTerm: string,
  filters?: SearchFilter[],
): Record<string, unknown> {
  const must: Record<string, unknown>[] = []
  const filter: Record<string, unknown>[] = []

  if (searchTerm) {
    must.push({
      match_phrase: {
        text: searchTerm,
      },
    })
  } else {
    must.push({ match_all: {} })
  }

  // Apply filters
  if (filters) {
    for (const f of filters) {
      if (f.field === 'item_title' && f.values.length > 0) {
        // Title filter uses item_id lookup (resolved in facet)
        filter.push({
          terms: { 'title.keyword': f.values },
        })
      } else if (f.field === 'item_id' && f.values.length > 0) {
        filter.push({
          terms: { item_id: f.values },
        })
      }
    }
  }

  return {
    bool: {
      must,
      ...(filter.length > 0 ? { filter } : {}),
    },
  }
}

function buildSortConfig(
  searchTerm: string,
  sortField?: string,
  sortDirection?: 'asc' | 'desc',
): Record<string, unknown>[] | undefined {
  const effectiveSortField = sortField || (searchTerm ? '_score' : 'appearance')
  const effectiveSortDirection = sortDirection || (searchTerm ? 'desc' : 'asc')

  if (!searchTerm && effectiveSortField === '_score') {
    return [
      { 'item_id.keyword': { order: 'asc' } },
      { _doc: { order: 'asc' } },
    ]
  }

  if (effectiveSortField === '_score') {
    return effectiveSortDirection === 'asc'
      ? [{ _score: { order: 'asc' } }]
      : undefined // default is _score desc
  }

  if (effectiveSortField === 'appearance') {
    return [
      { 'item_id.keyword': { order: effectiveSortDirection } },
      { _doc: { order: effectiveSortDirection } },
    ]
  }

  return undefined
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { state }: { state: SearchState } = body

  const searchTerm = state.searchTerm || ''
  const current = state.current || 1
  const resultsPerPage = state.resultsPerPage || 20
  const from = (current - 1) * resultsPerPage

  const query = buildSearchQuery(searchTerm, state.filters)
  const sort = buildSortConfig(searchTerm, state.sortField, state.sortDirection)

  const searchBody: Record<string, unknown> = {
    query,
    from,
    size: resultsPerPage,
    _source: ['item_id', 'page', 'title'],
    track_total_hits: true,
    highlight: {
      fields: {
        text: {
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
          fragment_size: 150,
          number_of_fragments: 3,
        },
      },
    },
  }

  if (sort) {
    searchBody.sort = sort
  }

  try {
    const data = await esSearch(INDEX_NAME, searchBody)
    const hits: PageHit[] = (data.hits?.hits || []) as unknown as PageHit[]
    const total = data.hits?.total?.value || 0

    // Collect unique item_ids (omeka IDs) to fetch bibliographic info
    const omekaIds = Array.from(new Set(hits.map((hit) => hit._source.item_id)))

    // Fetch item metadata from morrison_bib using omeka_id field
    // (bib index _id is now callNumber, so we search by omeka_id)
    let bibMap = new Map<string, BibDoc['_source'] & { callNumber: string }>()
    if (omekaIds.length > 0) {
      const bibQuery = {
        query: {
          terms: { omeka_id: omekaIds.map(Number) },
        },
        size: omekaIds.length,
        _source: ['title', 'heading1', 'tag1', 'publication_year', 'thumbnail_urls', 'omeka_id', 'has_image', 'callNumber'],
      }
      const bibData = await esSearch(BIB_INDEX_NAME, bibQuery)
      const bibHits: BibDoc[] = (bibData.hits?.hits || []) as unknown as BibDoc[]
      bibMap = new Map(bibHits.map((doc) => {
        const omekaId = String(doc._source.omeka_id || '')
        return [omekaId, { ...doc._source, callNumber: doc._id }]
      }))
    }

    // Transform results
    const results = hits.map((hit) => {
      const snippets = hit.highlight?.text || []
      const textSnippet = snippets.join(' ... ')
      const bib = bibMap.get(hit._source.item_id)
      const callNumber = bib?.callNumber || ''
      const thumbnailUrl = bib?.thumbnail_urls?.medium || bib?.thumbnail_urls?.small || ''

      return {
        id: { raw: hit._id },
        item_id: { raw: callNumber }, // callNumber as item ID
        omeka_item_id: { raw: hit._source.item_id }, // omeka ID for reference
        page: { raw: hit._source.page },
        text_snippet: { raw: textSnippet },
        item_title: { raw: bib?.title || hit._source.title || '' },
        author: { raw: bib?.heading1 || '' },
        classification: { raw: bib?.tag1 || '' },
        publication_year: { raw: bib?.publication_year || '' },
        thumbnail_url: { raw: thumbnailUrl },
        omeka_id: { raw: bib?.omeka_id || '' },
        has_image: { raw: bib?.has_image || false },
      }
    })

    // Build facets via aggregation query
    const facetBody: Record<string, unknown> = {
      query,
      size: 0,
      aggs: {
        item_titles: {
          terms: {
            field: 'title.keyword',
            size: 500,
          },
        },
      },
    }

    const facetData = await esSearch(INDEX_NAME, facetBody) as Record<string, unknown>
    const aggs = facetData.aggregations as Record<string, { buckets: { key: string; doc_count: number }[] }> | undefined
    const titleBuckets = aggs?.item_titles?.buckets || []

    const titleFacets = titleBuckets.map((bucket: { key: string; doc_count: number }) => ({
      value: bucket.key,
      count: bucket.doc_count,
    }))

    return NextResponse.json({
      results,
      totalResults: total,
      totalPages: Math.ceil(total / resultsPerPage),
      requestId: Date.now().toString(),
      facets: {
        item_title: [{ type: 'value', data: titleFacets }],
      },
    })
  } catch (error) {
    console.error('Fulltext search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform fulltext search' },
      { status: 500 },
    )
  }
}
