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
import { ensureEnv } from '@/libs/cf-env'
import { mediaThumbUrl } from '@/libs/media-image'
import { buildFacetAggs, buildSearchQuery, NE_FIELDS, type SearchFilter } from '@/libs/fulltext-query'

const INDEX_NAME = process.env.FULLTEXT_INDEX_NAME || 'morrison'
const BIB_INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

/**
 * ヒットしたページのサムネ URL。s3ds のクリーンPTIF
 * (`morrison_p/<group>/<callNumber>/<NNNN>.tif`) を img.toyobunko-lab.jp の
 * Cantaloupe で配信。Omeka 非依存(mediaThumbUrl が identifier を組み立てる)。
 */
function buildPageThumbnailUrl(callNumber: string, page: string | number): string {
  if (!callNumber || page === '' || page === undefined || page === null) return ''
  return mediaThumbUrl(callNumber, page, 300)
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

// 全文検索の対象を「書誌(morrison_bib)に存在し画像のあるアイテム」に限定するための
// item_id 集合。OCR インデックスには bib に無い孤立ページ(omeka_id が現行 bib に
// 取り込まれていない資料)が約18%混在し、callNumber も画像も無いリンク不能な結果に
// なるため、ここで除外する。値は再索引時しか変わらないので 10 分キャッシュ。
let validIdsCache: { ids: string[]; at: number } | null = null
const VALID_IDS_TTL = 10 * 60 * 1000

async function getValidItemIds(): Promise<string[]> {
  if (validIdsCache && Date.now() - validIdsCache.at < VALID_IDS_TTL) {
    return validIdsCache.ids
  }
  const data = (await esSearch(BIB_INDEX_NAME, {
    size: 0,
    query: { term: { has_image: true } },
    aggs: { ids: { terms: { field: 'omeka_id', size: 50000 } } },
  })) as Record<string, unknown>
  const aggs = data.aggregations as { ids?: { buckets?: { key: number | string }[] } } | undefined
  const ids = (aggs?.ids?.buckets || []).map((b) => String(b.key))
  validIdsCache = { ids, at: Date.now() }
  return ids
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
    // item_id / page は text(.keyword)なので、文字列順だと "100367" < "10757" の
    // ように壊れる。painless で数値化して並べる(値が無い/非数値は 0 にフォールバック)。
    const numScript = (field: string) => ({
      _script: {
        type: 'number',
        script: {
          source:
            `def f = doc['${field}']; if (f.size() == 0) return 0L; ` +
            `try { return Long.parseLong(f.value) } catch (Exception e) { return 0L }`,
        },
        order: effectiveSortDirection,
      },
    })
    return [numScript('item_id.keyword'), numScript('page.keyword')]
  }

  return undefined
}

export async function POST(request: NextRequest) {
  ensureEnv()
  const body = await request.json()
  const { state }: { state: SearchState } = body

  const searchTerm = state.searchTerm || ''
  const current = state.current || 1
  const resultsPerPage = state.resultsPerPage || 24
  const from = (current - 1) * resultsPerPage

  const sort = buildSortConfig(searchTerm, state.sortField, state.sortDirection)
  const filters: SearchFilter[] = state.filters || []

  try {
    const validItemIds = await getValidItemIds()
    const query = buildSearchQuery(searchTerm, filters, validItemIds)

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
      const thumbnailUrl = bib?.has_image ? mediaThumbUrl(callNumber, 1, 300) : ''

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
        page_thumbnail_url: { raw: buildPageThumbnailUrl(callNumber, hit._source.page) },
        thumbnail_url: { raw: thumbnailUrl }, // アイテム代表画像 (ページ画像の 404 時フォールバック)
        omeka_id: { raw: bib?.omeka_id || '' },
        has_image: { raw: bib?.has_image || false },
      }
    })

    // ファセット。人名・地名などもページ索引の上で集計するので、件数はページ数
    const facetData = await esSearch(INDEX_NAME, {
      query,
      size: 0,
      aggs: buildFacetAggs(),
    }) as Record<string, unknown>
    const aggs = facetData.aggregations as Record<string, { buckets?: { key: string; doc_count: number }[] }> | undefined
    const titleBuckets = aggs?.item_titles?.buckets || []

    const titleFacets = titleBuckets.map((bucket: { key: string; doc_count: number }) => ({
      value: bucket.key,
      count: bucket.doc_count,
    }))

    const entityFacets: Record<string, Array<{ type: string; data: { value: string; count: number }[] }>> = {}
    for (const f of NE_FIELDS) {
      const buckets = aggs?.[f]?.buckets || []
      if (buckets.length > 0) {
        entityFacets[f] = [{ type: 'value', data: buckets.map((b) => ({ value: b.key, count: b.doc_count })) }]
      }
    }

    return NextResponse.json({
      results,
      totalResults: total,
      totalPages: Math.ceil(total / resultsPerPage),
      requestId: Date.now().toString(),
      facets: {
        item_title: [{ type: 'value', data: titleFacets }],
        ...entityFacets,
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
