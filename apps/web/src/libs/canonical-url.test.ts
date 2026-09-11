/**
 * 外に出す URL の組み立ての試験。
 *
 * 引用文の URL が `/ja/item/…` になっていた（2026-09-11 に画面キャプチャで発見）。
 * 307 で辿り着けるため壊れて見えず、機能紹介の資料を作る過程で初めて気づいた。
 * 引用文は論文や目録に転載されるので、転送を挟まない形でなければならない。
 */

import { describe, expect, it } from 'vitest'
import { itemUrl, localeSegment } from './canonical-url'

const SITE = 'https://morrison.toyobunko-lab.jp'

describe('localeSegment', () => {
  it('日本語（既定）は接頭辞を付けない', () => {
    expect(localeSegment('ja')).toBe('')
  })

  it('英語は /en を付ける', () => {
    expect(localeSegment('en')).toBe('/en')
  })
})

describe('itemUrl', () => {
  it('日本語は /ja を挟まない', () => {
    expect(itemUrl(SITE, 'ja', 'P-III-a-0078')).toBe(`${SITE}/item/P-III-a-0078`)
    expect(itemUrl(SITE, 'ja', 'P-III-a-0078')).not.toContain('/ja/')
  })

  it('英語は /en を挟む', () => {
    expect(itemUrl(SITE, 'en', 'P-III-a-0078')).toBe(`${SITE}/en/item/P-III-a-0078`)
  })

  it('末尾のスラッシュがあっても二重にならない', () => {
    expect(itemUrl(`${SITE}/`, 'ja', 'P-I-a-0001')).toBe(`${SITE}/item/P-I-a-0001`)
  })

  it('ゼロ詰めしない請求記号でもそのまま使う', () => {
    expect(itemUrl(SITE, 'ja', 'P-V-A-a-42')).toBe(`${SITE}/item/P-V-A-a-42`)
  })
})
