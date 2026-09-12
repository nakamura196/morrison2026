/**
 * 全文検索(ページ単位の索引 `morrison`)の問い合わせ組み立て。
 *
 * 人名・地名などの固有表現は、ページごとに ne_* 欄として持っている。
 * 絞り込みも件数の集計も、このページ索引だけで行う。
 *
 * 以前は資料単位の索引(morrison_bib)の ne_* で資料を選び、その資料の全ページを
 * 返していた。そのため名前が出てこないページが約 9 割混ざり、ファセットの件数も
 * 資料数になっていた(Confucius: 表示 1,122 ページ / 実際に出てくるのは 112 ページ)。
 */

export const NE_FIELDS = ['ne_persName', 'ne_placeName', 'ne_orgName', 'ne_date'] as const

const NE_FIELD_SET = new Set<string>(NE_FIELDS)

export interface SearchFilter {
  field: string
  values: (string | number | boolean)[]
  type?: string
}

export function buildSearchQuery(
  searchTerm: string,
  filters?: SearchFilter[],
  validItemIds?: string[],
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

  // 書誌に存在するアイテムのみ(リンク・画像が必ずある結果に絞る)
  if (validItemIds && validItemIds.length > 0) {
    filter.push({ terms: { 'item_id.keyword': validItemIds } })
  }

  for (const f of filters || []) {
    if (f.values.length === 0) continue
    if (f.field === 'item_title') {
      filter.push({ terms: { 'title.keyword': f.values } })
    } else if (f.field === 'item_id') {
      filter.push({ terms: { item_id: f.values } })
    } else if (NE_FIELD_SET.has(f.field)) {
      // 同じ欄の中で複数選んだら「どれかが出てくるページ」、欄をまたぐと「両方が出てくるページ」
      filter.push({ terms: { [f.field]: f.values } })
    }
  }

  return {
    bool: {
      must,
      ...(filter.length > 0 ? { filter } : {}),
    },
  }
}

/** ファセットの集計。件数はすべてページ数になる。 */
export function buildFacetAggs(): Record<string, unknown> {
  const aggs: Record<string, unknown> = {
    item_titles: {
      terms: {
        field: 'title.keyword',
        size: 500,
      },
    },
  }
  for (const f of NE_FIELDS) {
    aggs[f] = { terms: { field: f, size: 50 } }
  }
  return aggs
}
