import { describe, expect, it } from 'vitest'
import { filterValueLabel } from './filter-value'

/**
 * 「あり / なし」の絞り込みの値が、画面で英語のまま出ないことを確かめる。
 *
 * 2026-09-11、本文ありで絞り込んだ札が `has_fulltext: true` と出ていた。
 * 以前は 1 / 0 しか読み替えておらず、検索エンジンが真偽 (true / false) で
 * 持っている項目 (has_image・has_fulltext) が素のまま出ていた。
 */

const labels = { yes: 'あり', no: 'なし' }

describe('filterValueLabel', () => {
  it('真偽値を読み替える', () => {
    expect(filterValueLabel(true, labels)).toBe('あり')
    expect(filterValueLabel(false, labels)).toBe('なし')
  })

  it('アドレスから復元した文字列の "true" / "false" も読み替える', () => {
    expect(filterValueLabel('true', labels)).toBe('あり')
    expect(filterValueLabel('false', labels)).toBe('なし')
  })

  it('古い索引の 1 / 0 も読み替える', () => {
    expect(filterValueLabel(1, labels)).toBe('あり')
    expect(filterValueLabel(0, labels)).toBe('なし')
  })

  it('ふつうの値はそのまま出す', () => {
    expect(filterValueLabel('III. CHINA', labels)).toBe('III. CHINA')
    expect(filterValueLabel('1904', labels)).toBe('1904')
    // 文字列の "1" は絞り込みの値としてありうるので、読み替えない。
    expect(filterValueLabel('1', labels)).toBe('1')
    expect(filterValueLabel(1904, labels)).toBe('1904')
  })

  it('英語の画面では英語で出す', () => {
    expect(filterValueLabel(true, { yes: 'Yes', no: 'No' })).toBe('Yes')
  })
})
