/**
 * 検索の問い合わせ組み立ての試験。
 *
 * ここで押さえているのは、実際に起きた不具合の再発防止:
 *   - 2 語以上でエラーになる (keyword の項目に連語照合をかけていた)
 *   - 語が離れていると 0 件になる (入力全体を連語として扱っていた)
 *   - 項目を指定した絞り込みができない
 */

import { describe, expect, it } from 'vitest'
import { buildBaseQuery, buildFilterClauses, phraseCapable, splitQuery } from './search-query'

/** 本番の検索が使う項目。callNumber / tag2 / tag3 は ES 側が keyword。 */
const FIELDS = [
  'title',
  'titleStatement',
  'heading1',
  'description',
  'abstract_en',
  'abstract_ja',
  'publication',
  'publisher',
  'callNumber',
  'tag2',
  'tag3',
]

/** クエリの中から、指定した型の multi_match をすべて集める。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchesOfType(query: any, type: string): any[] {
  const out: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    const mm = o.multi_match as { type?: string } | undefined
    if (mm && mm.type === type) out.push(mm)
    Object.values(o).forEach(walk)
  }
  walk(query)
  return out
}

describe('splitQuery', () => {
  it('空白で語に分ける', () => {
    expect(splitQuery('Isabella Bird')).toEqual({ phrases: [], words: ['Isabella', 'Bird'] })
  })

  it('引用符で囲んだ部分は連語として扱う', () => {
    expect(splitQuery('"Isabella Bird" china')).toEqual({
      phrases: ['Isabella Bird'],
      words: ['china'],
    })
  })

  it('空の引用符は連語として数えない', () => {
    expect(splitQuery('"" china')).toEqual({ phrases: [], words: ['china'] })
  })

  it('前後の空白や連続する空白をまたいでも語が壊れない', () => {
    expect(splitQuery('  Isabella   Bird  ').words).toEqual(['Isabella', 'Bird'])
  })
})

describe('phraseCapable', () => {
  it('語に分解していない項目 (keyword) を除く', () => {
    expect(phraseCapable(FIELDS)).not.toContain('callNumber')
    expect(phraseCapable(FIELDS)).not.toContain('tag2')
    expect(phraseCapable(FIELDS)).not.toContain('tag3')
    expect(phraseCapable(FIELDS)).toContain('title')
  })

  it('重み付きの表記 (`title^3`) でも項目名で判定する', () => {
    expect(phraseCapable(['title^3', 'callNumber^1'])).toEqual(['title^3'])
  })
})

describe('buildBaseQuery', () => {
  it('検索語が空なら全件', () => {
    expect(buildBaseQuery('', FIELDS)).toEqual({ match_all: {} })
    expect(buildBaseQuery('   ', FIELDS)).toEqual({ match_all: {} })
  })

  it('2 語は AND になる (語ごとに must が 1 つずつ)', () => {
    const q = buildBaseQuery('Isabella Bird', FIELDS) as { bool: { must: unknown[] } }
    expect(q.bool.must).toHaveLength(2)
  })

  it('連語の照合に keyword の項目を混ぜない', () => {
    // 混ざると ES が `Can only use phrase queries on text fields` で例外を投げ、
    // 検索全体が失敗する。実際に本番で 2 語検索が落ちていた原因。
    const q = buildBaseQuery('"Isabella Bird" china', FIELDS)
    for (const mm of matchesOfType(q, 'phrase')) {
      expect(mm.fields).not.toContain('callNumber')
      expect(mm.fields).not.toContain('tag2')
      expect(mm.fields).not.toContain('tag3')
    }
  })

  it('語単位の照合には keyword の項目も含める (請求記号を打っても当たる)', () => {
    const q = buildBaseQuery('P-III-a-0083', FIELDS)
    const best = matchesOfType(q, 'best_fields')
    expect(best).toHaveLength(1)
    expect(best[0].fields).toContain('callNumber')
  })

  it('引用符の中は連語、外は語ごとに扱う', () => {
    const q = buildBaseQuery('"Isabella Bird" china', FIELDS) as { bool: { must: unknown[] } }
    expect(matchesOfType(q, 'phrase').some(m => m.query === 'Isabella Bird')).toBe(true)
    expect(matchesOfType(q, 'best_fields').some(m => m.query === 'china')).toBe(true)
    expect(q.bool.must).toHaveLength(2)
  })

  it('1 語のときは並び順のための加点を付けない', () => {
    const q = buildBaseQuery('Isabella', FIELDS) as { bool: { should: unknown[] } }
    expect(q.bool.should).toEqual([])
  })

  it('2 語以上のときは入力どおりに並ぶものを上位に出す加点を付ける', () => {
    const q = buildBaseQuery('Isabella Bird', FIELDS) as { bool: { should: { multi_match: { query: string } }[] } }
    expect(q.bool.should).toHaveLength(1)
    expect(q.bool.should[0].multi_match.query).toBe('Isabella Bird')
  })

  it('連語に使える項目が無くても落ちない', () => {
    const q = buildBaseQuery('Isabella Bird', ['callNumber']) as { bool: { should: unknown[] } }
    expect(matchesOfType(q, 'phrase')).toHaveLength(0)
    expect(q.bool.should).toEqual([])
  })
})

describe('buildFilterClauses', () => {
  it('ファセット (選択肢から選ぶもの) は完全一致で絞る', () => {
    expect(buildFilterClauses([{ field: 'tag1', values: ['I. GENERAL REFERENCE WORKS'] }])).toEqual([
      { terms: { tag1: ['I. GENERAL REFERENCE WORKS'] } },
    ])
  })

  it('画像の有無 (真偽値) も完全一致のまま', () => {
    expect(buildFilterClauses([{ field: 'has_image', values: [true] }])).toEqual([
      { terms: { has_image: [true] } },
    ])
  })

  it('タイトルなどの自由入力は、語をすべて含むもの (AND) に絞る', () => {
    expect(buildFilterClauses([{ field: 'title', values: ['Isabella traveller'] }])).toEqual([
      { match: { title: { query: 'Isabella traveller', operator: 'and' } } },
    ])
  })

  it('著者・出版も自由入力として扱う', () => {
    expect(buildFilterClauses([{ field: 'heading1', values: ['Bullock'] }])[0]).toHaveProperty('match')
    expect(buildFilterClauses([{ field: 'publication', values: ['London'] }])[0]).toHaveProperty('match')
  })

  it('請求記号は前方一致 (途中まで打って範囲を絞れる)', () => {
    expect(buildFilterClauses([{ field: 'callNumber', values: ['P-III-a'] }])).toEqual([
      { prefix: { callNumber: 'P-III-a' } },
    ])
  })

  it('指定した項目を除ける (ファセットの自己除外に使う)', () => {
    const filters = [
      { field: 'tag1', values: ['A'] },
      { field: 'has_image', values: [true] },
    ]
    expect(buildFilterClauses(filters, 'tag1')).toEqual([{ terms: { has_image: [true] } }])
  })

  it('空文字だけの自由入力は完全一致に落とさず素通しする', () => {
    // 空を match に渡すと全件一致になってしまうため。
    expect(buildFilterClauses([{ field: 'title', values: ['   '] }])).toEqual([
      { terms: { title: ['   '] } },
    ])
  })
})
