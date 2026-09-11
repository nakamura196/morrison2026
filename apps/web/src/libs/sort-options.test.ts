/**
 * 並び替えの試験。
 *
 * 請求記号の並び順は 2025-01-10 に會谷さんよりご指摘をいただき、旧 Omeka 版で
 * 一度直している。新基盤で `callNumber` に戻ってしまい、`P-IV` の次が `P-IX` に
 * なる状態が再発した。同じ戻りが起きないよう、ここで押さえる。
 */

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SORT_VALUE,
  SORT_FIELD_CALL_NUMBER,
  SORT_OPTIONS,
  parseSortValue,
  toSortValue,
} from './sort-options'

describe('請求記号の並び替えに使う項目', () => {
  it('ローマ数字を算用数字に直した値で並べる', () => {
    // `callNumber` のままだと文字列順になり P-IV の次が P-IX になる。
    expect(SORT_FIELD_CALL_NUMBER).toBe('callNumber_converted')
  })

  it('既定の並び順は請求記号の昇順', () => {
    expect(DEFAULT_SORT_VALUE).toBe('callNumber_converted_asc')
  })

  it('選択肢の請求記号は変換後の項目を指している', () => {
    const callNumberOptions = SORT_OPTIONS.filter(o => o.labelKey.startsWith('sortCallNumber'))
    expect(callNumberOptions).toHaveLength(2)
    for (const o of callNumberOptions) {
      expect(parseSortValue(o.value).field).toBe('callNumber_converted')
    }
  })
})

describe('parseSortValue', () => {
  it('項目名に _ を含んでいても切り間違えない', () => {
    // 単純な split('_') だと field が `callNumber` になってしまう。
    expect(parseSortValue('callNumber_converted_asc')).toEqual({
      field: 'callNumber_converted',
      direction: 'asc',
    })
    expect(parseSortValue('callNumber_converted_desc')).toEqual({
      field: 'callNumber_converted',
      direction: 'desc',
    })
  })

  it('項目名にドットを含むものも扱える', () => {
    expect(parseSortValue('title.keyword_asc')).toEqual({ field: 'title.keyword', direction: 'asc' })
  })

  it('関連度順は項目を空にする', () => {
    expect(parseSortValue('relevance')).toEqual({ field: '', direction: 'asc' })
  })

  it('向きが読めないときは昇順とみなす', () => {
    expect(parseSortValue('publication_year')).toEqual({ field: 'publication', direction: 'asc' })
    expect(parseSortValue('callNumber')).toEqual({ field: 'callNumber', direction: 'asc' })
  })

  it('すべての選択肢が往復して同じ値に戻る', () => {
    for (const o of SORT_OPTIONS) {
      if (o.value === 'relevance') continue
      const { field, direction } = parseSortValue(o.value)
      expect(toSortValue(field, direction)).toBe(o.value)
    }
  })
})

describe('toSortValue', () => {
  it('項目が無いときは既定に戻す', () => {
    expect(toSortValue(undefined, undefined)).toBe(DEFAULT_SORT_VALUE)
    expect(toSortValue('', 'asc')).toBe(DEFAULT_SORT_VALUE)
  })

  it('向きを省いたら昇順', () => {
    expect(toSortValue('publication_year')).toBe('publication_year_asc')
  })
})
