/**
 * Elasticsearch access for the DTS API (Collection / Navigation / Document
 * search side). Document TEI download from S3 is handled in the route itself.
 *
 * - morrison_bib: _id = callNumber, fields incl. page_count / omeka_id / ne_*.
 *   No `group` field -> groups are derived from callNumber via a painless terms
 *   aggregation (callNumber is a keyword).
 * - morrison: page-level OCR text, _id = <omeka_id>_<n>, fields item_id / page /
 *   text. Joined to bib by omeka_id.
 */

import { esSearch } from '@toyo/shared-lib'
import { BIB_INDEX, FULLTEXT_INDEX, deriveGroup, type BibSource, type PageText } from './dts'

const BIB_FIELDS = [
  'title',
  'heading1',
  'publication',
  'publisher',
  'date',
  'publication_year',
  'description',
  'language',
  'callNumber',
  'tag1',
  'omeka_id',
  'page_count',
  'has_image',
  'ne_persName',
  'ne_placeName',
  'ne_orgName',
  'ne_date',
]

export interface BibRecord {
  callNumber: string
  source: BibSource
}

/** Distinct groups (e.g. P-III) with child counts, derived from callNumber. */
export async function fetchGroups(): Promise<{ group: string; count: number }[]> {
  const data = (await esSearch(BIB_INDEX, {
    size: 0,
    aggs: {
      grp: {
        terms: {
          size: 100,
          script: {
            source:
              "def c = doc['callNumber']; if (c.size() == 0) return 'NONE'; " +
              "def p = c.value.splitOnToken('-'); return p.length >= 2 ? p[0] + '-' + p[1] : c.value",
          },
        },
      },
    },
  })) as Record<string, unknown>
  const aggs = data.aggregations as { grp?: { buckets?: { key: string; doc_count: number }[] } } | undefined
  return (aggs?.grp?.buckets || [])
    .filter((b) => b.key !== 'NONE')
    .map((b) => ({ group: b.key, count: b.doc_count }))
    .sort((a, b) => a.group.localeCompare(b.group, undefined, { numeric: true }))
}

/** Items whose callNumber starts with `<group>-`, paginated. */
export async function fetchItemsInGroup(
  group: string,
  from: number,
  size: number,
): Promise<{ total: number; items: BibRecord[] }> {
  const data = await esSearch(BIB_INDEX, {
    from,
    size,
    track_total_hits: true,
    query: { prefix: { callNumber: `${group}-` } },
    sort: [{ callNumber: { order: 'asc' } }],
    _source: BIB_FIELDS,
  })
  const hits = data.hits?.hits || []
  return {
    total: data.hits?.total?.value || 0,
    items: hits.map((h) => ({ callNumber: h._id, source: h._source as BibSource })),
  }
}

/** A single bibliographic record by callNumber (= _id), or null if absent. */
export async function fetchBib(callNumber: string): Promise<BibRecord | null> {
  const data = await esSearch(BIB_INDEX, {
    size: 1,
    query: { ids: { values: [callNumber] } },
    _source: BIB_FIELDS,
  })
  const hit = data.hits?.hits?.[0]
  if (!hit) return null
  return { callNumber: hit._id, source: hit._source as BibSource }
}

/**
 * Page text for an item from the morrison index, deduplicated by page number
 * and sorted by numeric page. `item_id` in morrison is the omeka id (string).
 *
 * The index can hold more than one document for the same page (multiple OCR
 * passes merged over time), so we keep the longest text per page number — the
 * fuller transcription — and drop the rest, otherwise the generated TEI would
 * carry duplicate `<div>`/page entries.
 */
export async function fetchPages(omekaId: number, max = 2000): Promise<PageText[]> {
  const data = await esSearch(FULLTEXT_INDEX, {
    size: max,
    query: { term: { 'item_id.keyword': String(omekaId) } },
    _source: ['page', 'text'],
  })
  const hits = (data.hits?.hits || []) as Array<{ _source: { page?: string; text?: string } }>
  const byPage = new Map<number, string>()
  for (const h of hits) {
    const page = parseInt(String(h._source.page ?? '0'), 10) || 0
    if (page < 1) continue
    const text = h._source.text || ''
    const prev = byPage.get(page)
    if (prev === undefined || text.length > prev.length) byPage.set(page, text)
  }
  return Array.from(byPage.entries())
    .map(([page, text]) => ({ page, text }))
    .sort((a, b) => a.page - b.page)
}

export { deriveGroup }
