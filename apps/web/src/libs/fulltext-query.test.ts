/**
 * 全文検索の問い合わせ組み立ての試験。
 *
 * 押さえているのは、実際に起きた不具合の再発防止:
 *   - 人名・地名で絞ると、その名前が出てこないページまで結果に混ざる
 *     (資料単位で選んで、その資料の全ページを返していた)
 *   - ファセットの件数が資料数で、結果の件数(ページ数)と単位が合わない
 */

import { describe, expect, it } from 'vitest'
import { buildFacetAggs, buildSearchQuery, NE_FIELDS } from './fulltext-query'

function filterClauses(query: any): any[] {
  return query.bool.filter || []
}

describe('buildSearchQuery', () => {
  it('人名の絞り込みは、ページ索引の欄そのものにかける', () => {
    const q = buildSearchQuery('', [{ field: 'ne_persName', values: ['Confucius'], type: 'all' }])
    expect(filterClauses(q)).toEqual([{ terms: { ne_persName: ['Confucius'] } }])
  })

  it('資料番号に置き換えて絞り込まない', () => {
    const q = buildSearchQuery('', [{ field: 'ne_persName', values: ['Confucius'] }], ['123', '456'])
    const itemIdClauses = filterClauses(q).filter((c) => c.terms?.['item_id.keyword'])
    // 残るのは「書誌に存在する資料」の絞り込み 1 つだけ
    expect(itemIdClauses).toEqual([{ terms: { 'item_id.keyword': ['123', '456'] } }])
  })

  it('人名と地名を選ぶと、両方が出てくるページに絞る', () => {
    const q = buildSearchQuery('', [
      { field: 'ne_persName', values: ['Confucius'] },
      { field: 'ne_placeName', values: ['Peking'] },
    ])
    expect(filterClauses(q)).toEqual([
      { terms: { ne_persName: ['Confucius'] } },
      { terms: { ne_placeName: ['Peking'] } },
    ])
  })

  it('値が空の絞り込みと、知らない欄は無視する', () => {
    const q = buildSearchQuery('', [
      { field: 'ne_persName', values: [] },
      { field: 'text', values: ['x'] },
    ])
    expect(filterClauses(q)).toEqual([])
  })

  it('書名の絞り込みは title.keyword にかける', () => {
    const q = buildSearchQuery('', [{ field: 'item_title', values: ['Some Title'] }])
    expect(filterClauses(q)).toEqual([{ terms: { 'title.keyword': ['Some Title'] } }])
  })

  it('語があれば本文を連語で照合し、無ければ全件', () => {
    const withTerm: any = buildSearchQuery('Confucius')
    expect(withTerm.bool.must).toEqual([{ match_phrase: { text: 'Confucius' } }])
    const without: any = buildSearchQuery('')
    expect(without.bool.must).toEqual([{ match_all: {} }])
  })
})

describe('buildFacetAggs', () => {
  it('固有表現の 4 欄をページ索引の上で集計する', () => {
    const aggs = buildFacetAggs()
    for (const f of NE_FIELDS) {
      expect(aggs[f]).toEqual({ terms: { field: f, size: 50 } })
    }
    expect(aggs.item_titles).toBeDefined()
  })
})
