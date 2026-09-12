/**
 * 可視化の図から検索ページへ渡すリンクを組み立てる。
 *
 * 検索画面 (Search UI) は、絞り込み条件をアドレス (URL) に次の形で持っている。
 *
 *   ?filters[0][field]=tag1&filters[0][values][0]=III.%20CHINA&filters[0][type]=all
 *
 * この形で開くと、検索画面は読み込み時にその条件で検索し、該当するファセットにも
 * チェックが入った状態になる。図をクリックして検索へ渡すには、同じ形を作ればよい。
 *
 * 値の書き方に癖がある。Search UI は数値を `n_1904_n`、真偽値を `b_true_b` と
 * 書いて型を保存する (@elastic/search-ui の URLManager)。素の `true` と書くと
 * 文字列の "true" として読まれ、boolean の項目 (has_image) に一致しない。
 */

/** 絞り込み 1 件分。`values` が複数なら「どれか」(OR) で絞り込まれる。 */
export interface LinkFilter {
  field: string
  values: (string | number | boolean)[]
}

export type SearchPath = '/search' | '/fulltext-search'

/** Search UI が URL に書くのと同じ値の表記にする。 */
function encodeValue(value: string | number | boolean): string {
  if (typeof value === 'number') return `n_${value}_n`
  if (typeof value === 'boolean') return `b_${value}_b`
  return value
}

/**
 * 検索ページへのリンクを作る。
 *
 * @param path      `/search` (書誌) か `/fulltext-search` (本文)
 * @param q         検索語 (省略可)
 * @param filters   絞り込み条件 (省略可)
 */
export function buildSearchHref(
  path: SearchPath,
  { q, filters = [] }: { q?: string; filters?: LinkFilter[] } = {},
): string {
  const params: string[] = []

  if (q && q.trim()) {
    params.push(`q=${encodeURIComponent(q.trim())}`)
  }

  filters.forEach((filter, i) => {
    if (filter.values.length === 0) return
    params.push(`filters[${i}][field]=${encodeURIComponent(filter.field)}`)
    filter.values.forEach((value, j) => {
      params.push(`filters[${i}][values][${j}]=${encodeURIComponent(encodeValue(value))}`)
    })
    // Search UI のファセットは type=all で条件を書く。合わせておかないと、
    // 検索は効いてもファセット側にチェックが入らない。
    params.push(`filters[${i}][type]=all`)
  })

  return params.length > 0 ? `${path}?${params.join('&')}` : path
}

/** 大分類 (tag1) で絞り込んだ検索ページ。 */
export function classificationHref(tag1: string): string {
  return buildSearchHref('/search', { filters: [{ field: 'tag1', values: [tag1] }] })
}

/**
 * 請求記号の前方一致で絞り込んだ検索ページ。
 * `P-III-a` のように途中まで指定すると、その区分がまとまって出てくる
 * (前方一致は libs/search-query.ts の PREFIX_FILTER_FIELDS で処理される)。
 */
export function callNumberPrefixHref(prefix: string): string {
  return buildSearchHref('/search', { filters: [{ field: 'callNumber', values: [prefix] }] })
}

/** 出版年 (1 年または複数年) で絞り込んだ検索ページ。 */
export function publicationYearHref(years: string[]): string {
  return buildSearchHref('/search', { filters: [{ field: 'publication_year', values: years }] })
}

/** 著者で絞り込んだ検索ページ。ファセットと同じ完全一致の項目を使う。 */
export function authorHref(author: string): string {
  return buildSearchHref('/search', { filters: [{ field: 'heading1.keyword', values: [author] }] })
}

/** 大分類のうち、本文 (OCR) が入っているものだけに絞り込んだ検索ページ。 */
export function classificationFulltextHref(tag1: string): string {
  return buildSearchHref('/search', {
    filters: [
      { field: 'tag1', values: [tag1] },
      { field: 'has_fulltext', values: [true] },
    ],
  })
}

/** 画像あり / 本文あり で絞り込んだ検索ページ。 */
export function flagHref(field: 'has_image' | 'has_fulltext', value: boolean): string {
  return buildSearchHref('/search', { filters: [{ field, values: [value] }] })
}

/** 本文から抽出した固有表現で絞り込んだ全文検索ページ。 */
export function entityHref(
  field: 'ne_persName' | 'ne_placeName' | 'ne_orgName' | 'ne_date',
  value: string,
): string {
  return buildSearchHref('/fulltext-search', { filters: [{ field, values: [value] }] })
}
