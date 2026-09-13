import { describe, expect, it } from 'vitest'
import { mediaThumbUrl } from '@/libs/media-image'
import { IMAGE_FORMAT, encodeIdentifier, imageIdentifier, imageServiceUrl } from '@/libs/iiif-image'

/**
 * サムネイルの URL。画像サーバ (iipsrv) の作法を 2 つ間違えやすいので固定する。
 *   - 識別子のスラッシュは潰さない (%2F にすると 404)
 *   - 請求記号に丸括弧が入るものがあるので、区切りの中だけエンコードする
 * 2026-09-14 に形式を WebP に切り替えたので、その既定もここで見張る。
 */
describe('mediaThumbUrl', () => {
  it('既定は WebP で、区切りのスラッシュは残る', () => {
    const url = mediaThumbUrl('P-III-a-0083', 5, 300)
    expect(url).toBe(
      'https://img.toyobunko-lab.jp/iiif/morrison_p/P-III/P-III-a-0083/0005.tif/full/!300,300/0/default.webp',
    )
  })

  it('形式は 1 か所 (IMAGE_FORMAT) で決まる', () => {
    expect(mediaThumbUrl('P-I-a-0001')).toContain(`/default.${IMAGE_FORMAT}`)
  })

  it('丸括弧を含む請求記号はそのまま通る (encodeURIComponent は括弧を変えない)', () => {
    const url = mediaThumbUrl('P-III-a-1999(5)', 1, 400)
    expect(url).toContain('/morrison_p/P-III/P-III-a-1999(5)/0001.tif/')
  })

  it('区切りのスラッシュは残し、区切りの中だけエンコードする', () => {
    // %2F にすると iipsrv は 404 を返す。逆に区切りの中の危ない文字は潰す。
    expect(encodeIdentifier('morrison_p/P-III/P-III-a-1 #2/0001.tif')).toBe(
      'morrison_p/P-III/P-III-a-1%20%232/0001.tif',
    )
  })

  it('請求記号が無ければ空文字 (呼び出し側で出し分ける)', () => {
    expect(mediaThumbUrl(undefined)).toBe('')
  })

  it('識別子とサービス URL の組み立て', () => {
    expect(imageIdentifier('P-XIV-a-0003', 1)).toBe('morrison_p/P-XIV/P-XIV-a-0003/0001.tif')
    expect(imageServiceUrl('P-XIV-a-0003', 1)).toBe(
      'https://img.toyobunko-lab.jp/iiif/morrison_p/P-XIV/P-XIV-a-0003/0001.tif',
    )
  })
})
