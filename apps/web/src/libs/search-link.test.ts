import { describe, expect, it } from 'vitest'
import {
  authorHref,
  buildSearchHref,
  callNumberPrefixHref,
  classificationHref,
  entityHref,
  flagHref,
  publicationYearHref,
} from './search-link'

/** Search UI が URL から条件を読み取るのと同じ手順で読み直す。 */
function parseFilters(href: string) {
  const query = href.split('?')[1] || ''
  const params = new URLSearchParams(query)
  const filters: Record<number, { field?: string; values: string[]; type?: string }> = {}
  params.forEach((value, key) => {
    const m = key.match(/^filters\[(\d+)\]\[(field|type|values)\](?:\[(\d+)\])?$/)
    if (!m) return
    const idx = Number(m[1])
    filters[idx] = filters[idx] || { values: [] }
    if (m[2] === 'field') filters[idx].field = value
    else if (m[2] === 'type') filters[idx].type = value
    else filters[idx].values[Number(m[3])] = value
  })
  return filters
}

describe('buildSearchHref', () => {
  it('条件が無ければ検索ページのパスだけを返す', () => {
    expect(buildSearchHref('/search')).toBe('/search')
  })

  it('検索語を q に載せる', () => {
    expect(buildSearchHref('/search', { q: 'China railway' })).toBe('/search?q=China%20railway')
  })

  it('項目と値を Search UI の形で並べる', () => {
    const href = classificationHref('III. CHINA')
    expect(parseFilters(href)[0]).toEqual({ field: 'tag1', values: ['III. CHINA'], type: 'all' })
  })

  it('複数の年を 1 つの条件にまとめる (どれかに一致)', () => {
    const href = publicationYearHref(['1900', '1901', '1902'])
    expect(parseFilters(href)[0]).toEqual({
      field: 'publication_year',
      values: ['1900', '1901', '1902'],
      type: 'all',
    })
  })

  it('真偽値は Search UI の表記 (b_true_b) にする', () => {
    // 素の "true" と書くと文字列として読まれ、boolean の項目に一致しない。
    const href = flagHref('has_image', true)
    expect(parseFilters(href)[0].values).toEqual(['b_true_b'])
  })

  it('空の値は条件にしない', () => {
    expect(buildSearchHref('/search', { filters: [{ field: 'tag1', values: [] }] })).toBe('/search')
  })

  it('著者はファセットと同じ完全一致の項目を使う', () => {
    expect(parseFilters(authorHref('Cordier, Henri.'))[0]).toEqual({
      field: 'heading1.keyword',
      values: ['Cordier, Henri.'],
      type: 'all',
    })
  })

  it('請求記号は前方一致で使う (P-III-a でその区分がまとまる)', () => {
    expect(parseFilters(callNumberPrefixHref('P-III-a'))[0].field).toBe('callNumber')
  })

  it('固有表現は全文検索ページに渡す', () => {
    const href = entityHref('ne_persName', 'Confucius')
    expect(href.startsWith('/fulltext-search?')).toBe(true)
    expect(parseFilters(href)[0]).toEqual({
      field: 'ne_persName',
      values: ['Confucius'],
      type: 'all',
    })
  })
})
