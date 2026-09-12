import { describe, expect, it } from 'vitest'
import {
  buildBibAggsQuery,
  buildEntityAggsQuery,
  emptyStats,
  parseBibStats,
  parseEntityStats,
} from './stats'

describe('buildBibAggsQuery', () => {
  it('資料を数えずに集計だけ取る', () => {
    const q = buildBibAggsQuery()
    expect(q.size).toBe(0)
    expect(q.track_total_hits).toBe(true)
  })

  it('大分類の下に、請求記号の下位区分と本文ありの数を入れる', () => {
    const aggs = buildBibAggsQuery().aggs as Record<string, Record<string, unknown>>
    expect((aggs.classification.terms as { field: string }).field).toBe('tag1')
    expect(aggs.classification.aggs).toHaveProperty('sub')
    expect(aggs.classification.aggs).toHaveProperty('fulltext')
  })

  it('出版年は古い順に並べる', () => {
    const aggs = buildBibAggsQuery().aggs as Record<string, Record<string, unknown>>
    expect(aggs.years.terms).toMatchObject({ field: 'publication_year', order: { _key: 'asc' } })
  })
})

describe('buildEntityAggsQuery', () => {
  it('4 つの欄それぞれに、上位語とページ数の集計を作る', () => {
    const aggs = buildEntityAggsQuery(10).aggs as Record<string, unknown>
    expect(Object.keys(aggs)).toEqual([
      'ne_persName',
      'ne_persName__pages',
      'ne_placeName',
      'ne_placeName__pages',
      'ne_orgName',
      'ne_orgName__pages',
      'ne_date',
      'ne_date__pages',
    ])
  })
})

const bibResponse = {
  hits: { total: { value: 8154 } },
  aggregations: {
    classification: {
      buckets: [
        {
          key: 'III. CHINA',
          doc_count: 5224,
          fulltext: { doc_count: 4800 },
          sub: {
            buckets: [
              { key: 'P-III-a', doc_count: 3484 },
              { key: 'P-III-b', doc_count: 1259 },
              { key: 'NONE', doc_count: 3 },
            ],
          },
        },
        { key: '', doc_count: 7 },
      ],
    },
    years: {
      buckets: [
        { key: '', doc_count: 1450 },
        { key: '1904', doc_count: 288 },
        { key: '1913', doc_count: 246 },
        { key: '9986', doc_count: 1 },
      ],
    },
    authors: {
      buckets: [
        { key: '（記録なし）', doc_count: 132 },
        { key: 'Cordier, Henri.', doc_count: 38 },
        { key: '', doc_count: 5 },
      ],
    },
    has_image: { doc_count: 8138 },
    has_fulltext: { doc_count: 7252 },
    image_pages: { value: 131724.0 },
  },
}

describe('parseBibStats', () => {
  const stats = parseBibStats(bibResponse)

  it('資料数・画像ページ数・本文ありの数を読む', () => {
    expect(stats.totalItems).toBe(8154)
    expect(stats.totalImagePages).toBe(131724)
    expect(stats.withImage).toBe(8138)
    expect(stats.withFulltext).toBe(7252)
  })

  it('大分類と、その下の区分を組み立てる', () => {
    expect(stats.classifications).toHaveLength(1) // 名前の無い分類は出さない
    expect(stats.classifications[0]).toMatchObject({
      key: 'III. CHINA',
      count: 5224,
      fulltextCount: 4800,
    })
    // 請求記号が取れなかったもの (NONE) は下位区分に出さない
    expect(stats.classifications[0].children.map((c) => c.key)).toEqual(['P-III-a', 'P-III-b'])
  })

  it('年として読めないものは棒にせず、「年が無い」件数に回す', () => {
    expect(stats.years).toEqual([
      { year: 1904, count: 288 },
      { year: 1913, count: 246 },
    ])
    // 8154 - (288 + 246) = 7620 (空欄 1450 と 9986 の 1 件を含む)
    expect(stats.yearsMissing).toBe(7620)
  })

  it('著者の「（記録なし）」と空欄は順位に出さない', () => {
    expect(stats.authors).toEqual([{ key: 'Cordier, Henri.', count: 38 }])
  })
})

describe('parseEntityStats', () => {
  it('上位語と、固有表現がついているページ数を読む', () => {
    const parsed = parseEntityStats({
      hits: { total: { value: 107089 } },
      aggregations: {
        ne_persName: { buckets: [{ key: 'Confucius', doc_count: 112 }] },
        ne_persName__pages: { doc_count: 4278 },
      },
    })
    expect(parsed.fulltextPages).toBe(107089)
    expect(parsed.entities.ne_persName).toEqual([{ key: 'Confucius', count: 112 }])
    expect(parsed.entityPages.ne_persName).toBe(4278)
    expect(parsed.entities.ne_placeName).toEqual([])
  })
})

describe('emptyStats', () => {
  it('検索エンジンに繋がらないときでもページが組み立てられる形を返す', () => {
    const stats = emptyStats()
    expect(stats.totalItems).toBe(0)
    expect(stats.classifications).toEqual([])
    expect(stats.entities.ne_orgName).toEqual([])
  })
})
