/**
 * 検索結果の並び替えの選択肢。
 *
 * 請求記号は `callNumber` ではなく `callNumber_converted` で並べる。
 * 請求記号にはローマ数字が入っていて (`P-III-a-0083`)、文字列のまま並べると
 * アルファベット順になり `P-IV` の次が `P-IX` になってしまう。
 * `callNumber_converted` はローマ数字を算用数字に直した値 (`P-03-a-0083`) で、
 * これで並べると意図どおりの順になる。
 * (2025-01-10 に會谷さんよりご指摘。旧 Omeka 版で一度直したが、
 *  新基盤で `callNumber` に戻ってしまっていた)
 */

export const SORT_FIELD_CALL_NUMBER = 'callNumber_converted'

/** 並び替えの選択肢の値。`<項目>_<向き>`、関連度順だけ `relevance`。 */
export const SORT_OPTIONS = [
  { value: `${SORT_FIELD_CALL_NUMBER}_asc`, labelKey: 'sortCallNumberAsc' },
  { value: `${SORT_FIELD_CALL_NUMBER}_desc`, labelKey: 'sortCallNumberDesc' },
  { value: 'relevance', labelKey: 'sortRelevance' },
  { value: 'title.keyword_asc', labelKey: 'sortTitleAsc' },
  { value: 'title.keyword_desc', labelKey: 'sortTitleDesc' },
  { value: 'heading1.keyword_asc', labelKey: 'sortAuthorAsc' },
  { value: 'heading1.keyword_desc', labelKey: 'sortAuthorDesc' },
  { value: 'publication_year_asc', labelKey: 'sortYearAsc' },
  { value: 'publication_year_desc', labelKey: 'sortYearDesc' },
] as const

/** 既定の並び順 (請求記号の昇順)。 */
export const DEFAULT_SORT_VALUE = `${SORT_FIELD_CALL_NUMBER}_asc`

export type ParsedSort = { field: string; direction: 'asc' | 'desc' }

/**
 * 選択肢の値を「項目」と「向き」に分ける。
 *
 * 項目名自体に `_` を含むもの (`callNumber_converted`) があるので、
 * 最後の `_` で切る。`split('_')` だと項目名が途中で切れてしまう。
 * 関連度順は項目を空にする (ES に sort を渡さない = スコア順)。
 */
export function parseSortValue(value: string): ParsedSort {
  if (value === 'relevance') return { field: '', direction: 'asc' }
  const at = value.lastIndexOf('_')
  if (at < 0) return { field: value, direction: 'asc' }
  const direction = value.slice(at + 1)
  return {
    field: value.slice(0, at),
    direction: direction === 'desc' ? 'desc' : 'asc',
  }
}

/** 現在の並び順から、選択肢の値を作る。 */
export function toSortValue(field?: string, direction?: string): string {
  if (!field) return DEFAULT_SORT_VALUE
  return `${field}_${direction || 'asc'}`
}
