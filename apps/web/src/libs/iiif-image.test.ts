/**
 * 画像 URL の組み立ての試験。
 *
 * 配信元を Cantaloupe (media.toyobunko-lab.jp) から iipsrv (img.toyobunko-lab.jp)
 * へ移したときに踏んだ違いを、ここで固定しておく。
 *   - 識別子の区切り: %2F ではなくスラッシュのまま (%2F だと 404)
 *   - 原寸の指定:     full/max ではなく full/full (max だと 400)
 */

import { describe, expect, it } from 'vitest'
import {
  FULL_SIZE,
  IMAGE_IIIF_BASE,
  deriveGroup,
  encodeIdentifier,
  imageIdentifier,
  imageServiceUrl,
} from './iiif-image'

describe('deriveGroup', () => {
  it('請求記号の先頭 2 区切りがグループ', () => {
    expect(deriveGroup('P-III-a-0083')).toBe('P-III')
    expect(deriveGroup('P-I-a-0001')).toBe('P-I')
  })

  it('区切りが多い請求記号でも先頭 2 つだけ取る', () => {
    expect(deriveGroup('P-V-A-a-42')).toBe('P-V')
  })
})

describe('imageIdentifier', () => {
  it('ページ番号を 4 桁に揃える', () => {
    expect(imageIdentifier('P-III-a-0083', 1)).toBe('morrison_p/P-III/P-III-a-0083/0001.tif')
    expect(imageIdentifier('P-III-a-0083', 132)).toBe('morrison_p/P-III/P-III-a-0083/0132.tif')
  })

  it('ページを省いたら 1 ページ目', () => {
    expect(imageIdentifier('P-I-a-0001')).toMatch(/0001\.tif$/)
  })

  it('文字列で渡したページ番号も揃える', () => {
    expect(imageIdentifier('P-I-a-0001', '7')).toMatch(/0007\.tif$/)
  })
})

describe('encodeIdentifier', () => {
  it('区切りのスラッシュはそのまま残す', () => {
    // %2F に潰すと iipsrv が識別子を解決できず 404 になる。
    expect(encodeIdentifier('morrison_p/P-III/P-III-a-0083/0001.tif')).toBe(
      'morrison_p/P-III/P-III-a-0083/0001.tif',
    )
  })

  it('区切りの中に現れる特殊文字は逃がす', () => {
    expect(encodeIdentifier('a b/c')).toBe('a%20b/c')
  })
})

describe('imageServiceUrl', () => {
  it('新しい画像サーバ向けの URL になる', () => {
    expect(imageServiceUrl('P-III-a-0083', 1)).toBe(
      'https://img.toyobunko-lab.jp/iiif/morrison_p/P-III/P-III-a-0083/0001.tif',
    )
  })

  it('%2F を含まない', () => {
    expect(imageServiceUrl('P-III-a-0083', 1)).not.toContain('%2F')
  })

  it('配信元を差し替えられる', () => {
    expect(imageServiceUrl('P-I-a-0001', 1, 'https://example.test/iiif')).toBe(
      'https://example.test/iiif/morrison_p/P-I/P-I-a-0001/0001.tif',
    )
  })
})

describe('原寸の指定', () => {
  it('IIIF Image API 2 の書き方 (full)', () => {
    // iipsrv は Image API 2 のみ。`max` は 3 の書き方で 400 が返る。
    expect(FULL_SIZE).toBe('full')
  })

  it('組み立てた画像 URL に full/max が出てこない', () => {
    const url = `${imageServiceUrl('P-I-a-0001', 1)}/full/${FULL_SIZE}/0/default.jpg`
    expect(url).not.toContain('full/max')
    expect(url).toBe(
      'https://img.toyobunko-lab.jp/iiif/morrison_p/P-I/P-I-a-0001/0001.tif/full/full/0/default.jpg',
    )
  })
})

describe('配信元', () => {
  it('既定は東洋文庫の画像サーバ', () => {
    expect(IMAGE_IIIF_BASE).toBe('https://img.toyobunko-lab.jp/iiif')
  })
})
