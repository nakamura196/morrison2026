/**
 * 可視化ページのための集計。
 *
 * 問い合わせの組み立てと、返ってきた集計結果の読み取りだけを置く。検索エンジンを
 * 立てずに試験できるよう、通信は libs/stats-data.ts に分けてある。
 *
 * 図を 1 枚足すときは、ここに集計を 1 つ足し、読み取り結果に項目を 1 つ増やし、
 * 部品 (components/pages/visualize/) を 1 つ作る。それ以外は触らなくてよい。
 *
 * 数えるもとは 2 つある。
 *   - morrison_bib: 資料 1 件が 1 件 (分類・出版年・著者・画像や本文の有無)
 *   - morrison    : 本文 1 ページが 1 件 (本文から抽出した人名・地名・組織名)
 */

/** 名前と件数の組。棒グラフの 1 本にあたる。 */
export interface NameCount {
  key: string
  count: number
}

/** 大分類 1 つ分。children は請求記号の下位区分 (P-III-a など)。 */
export interface ClassificationNode {
  key: string
  count: number
  /** そのうち本文 (OCR) が入っている件数。 */
  fulltextCount: number
  children: NameCount[]
}

export interface YearBucket {
  year: number
  count: number
}

/** 本文から抽出した固有表現の欄。全文検索の絞り込み項目と同じ名前。 */
export const ENTITY_FIELDS = ['ne_persName', 'ne_placeName', 'ne_orgName', 'ne_date'] as const
export type EntityField = (typeof ENTITY_FIELDS)[number]

export interface Stats {
  /** 資料の件数。 */
  totalItems: number
  /** 画像のページ数の合計。 */
  totalImagePages: number
  withImage: number
  withFulltext: number
  classifications: ClassificationNode[]
  years: YearBucket[]
  /** 出版年が入っていない・年として読めない資料の件数。 */
  yearsMissing: number
  authors: NameCount[]
  /** 固有表現の上位語。件数は「その語が出てくるページ数」。 */
  entities: Record<EntityField, NameCount[]>
  /** 固有表現が 1 つ以上ついているページ数 (欄ごと)。 */
  entityPages: Record<EntityField, number>
  /** 本文を入れてある全ページ数。 */
  fulltextPages: number
}

/** 著者の欄に入っている「著者不明」の目印。順位には出さない。 */
const AUTHOR_PLACEHOLDER = new Set(['（記録なし）', '(記録なし)'])

/** 年として受け付ける範囲。1 件だけ 9986 のような入力誤りがある。 */
const YEAR_MIN = 1500
const YEAR_MAX = 2100

/**
 * 請求記号から下位区分を取り出す (`P-III-a-1813` → `P-III-a`)。
 * ES 側に下位区分の欄が無いので、集計時に請求記号から作る。
 */
const SUBGROUP_SCRIPT =
  "def c = doc['callNumber']; if (c.size() == 0) return 'NONE'; " +
  "def p = c.value.splitOnToken('-'); " +
  "return p.length >= 3 ? p[0] + '-' + p[1] + '-' + p[2] : c.value"

/** 書誌 (morrison_bib) 側の集計。 */
export function buildBibAggsQuery(): Record<string, unknown> {
  return {
    size: 0,
    track_total_hits: true,
    aggs: {
      classification: {
        terms: { field: 'tag1', size: 30 },
        aggs: {
          sub: { terms: { script: { source: SUBGROUP_SCRIPT }, size: 20 } },
          fulltext: { filter: { term: { has_fulltext: true } } },
        },
      },
      years: { terms: { field: 'publication_year', size: 400, order: { _key: 'asc' } } },
      authors: { terms: { field: 'heading1.keyword', size: 40 } },
      has_image: { filter: { term: { has_image: true } } },
      has_fulltext: { filter: { term: { has_fulltext: true } } },
      image_pages: { sum: { field: 'page_count' } },
    },
  }
}

/** 本文 (morrison) 側の集計。固有表現の上位語を数える。 */
export function buildEntityAggsQuery(topN = 30): Record<string, unknown> {
  const aggs: Record<string, unknown> = {}
  for (const field of ENTITY_FIELDS) {
    aggs[field] = { terms: { field, size: topN } }
    aggs[`${field}__pages`] = { filter: { exists: { field } } }
  }
  return { size: 0, track_total_hits: true, aggs }
}

// ===== 読み取り =====

interface TermsBucket {
  key: string | number
  doc_count: number
  [key: string]: unknown
}

function buckets(agg: unknown): TermsBucket[] {
  const a = agg as { buckets?: TermsBucket[] } | undefined
  return Array.isArray(a?.buckets) ? a.buckets : []
}

function docCount(agg: unknown): number {
  const a = agg as { doc_count?: number } | undefined
  return typeof a?.doc_count === 'number' ? a.doc_count : 0
}

function sumValue(agg: unknown): number {
  const a = agg as { value?: number } | undefined
  return typeof a?.value === 'number' ? a.value : 0
}

/** 空の結果。検索エンジンに繋がらないときはこれを返し、ページは注記を出す。 */
export function emptyStats(): Stats {
  return {
    totalItems: 0,
    totalImagePages: 0,
    withImage: 0,
    withFulltext: 0,
    classifications: [],
    years: [],
    yearsMissing: 0,
    authors: [],
    entities: { ne_persName: [], ne_placeName: [], ne_orgName: [], ne_date: [] },
    entityPages: { ne_persName: 0, ne_placeName: 0, ne_orgName: 0, ne_date: 0 },
    fulltextPages: 0,
  }
}

/** 書誌側の集計結果を読み取る。 */
export function parseBibStats(response: unknown): Omit<Stats, 'entities' | 'entityPages' | 'fulltextPages'> {
  const res = response as {
    hits?: { total?: { value?: number } }
    aggregations?: Record<string, unknown>
  }
  const aggs = res?.aggregations || {}
  const totalItems = res?.hits?.total?.value ?? 0

  const classifications: ClassificationNode[] = buckets(aggs.classification)
    .filter((b) => String(b.key) !== '')
    .map((b) => ({
      key: String(b.key),
      count: b.doc_count,
      fulltextCount: docCount(b.fulltext),
      children: buckets(b.sub)
        .filter((s) => String(s.key) !== 'NONE')
        .map((s) => ({ key: String(s.key), count: s.doc_count })),
    }))

  const years: YearBucket[] = []
  let yearsCounted = 0
  for (const b of buckets(aggs.years)) {
    const year = Number(String(b.key))
    if (!Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX) continue
    years.push({ year, count: b.doc_count })
    yearsCounted += b.doc_count
  }
  years.sort((a, b) => a.year - b.year)

  const authors: NameCount[] = buckets(aggs.authors)
    .filter((b) => String(b.key) !== '' && !AUTHOR_PLACEHOLDER.has(String(b.key)))
    .map((b) => ({ key: String(b.key), count: b.doc_count }))

  return {
    totalItems,
    totalImagePages: Math.round(sumValue(aggs.image_pages)),
    withImage: docCount(aggs.has_image),
    withFulltext: docCount(aggs.has_fulltext),
    classifications,
    years,
    yearsMissing: Math.max(0, totalItems - yearsCounted),
    authors,
  }
}

/** 本文側の集計結果を読み取る。 */
export function parseEntityStats(
  response: unknown,
): Pick<Stats, 'entities' | 'entityPages' | 'fulltextPages'> {
  const res = response as {
    hits?: { total?: { value?: number } }
    aggregations?: Record<string, unknown>
  }
  const aggs = res?.aggregations || {}

  const entities = {} as Record<EntityField, NameCount[]>
  const entityPages = {} as Record<EntityField, number>
  for (const field of ENTITY_FIELDS) {
    entities[field] = buckets(aggs[field])
      .filter((b) => String(b.key) !== '')
      .map((b) => ({ key: String(b.key), count: b.doc_count }))
    entityPages[field] = docCount(aggs[`${field}__pages`])
  }

  return {
    entities,
    entityPages,
    fulltextPages: res?.hits?.total?.value ?? 0,
  }
}
