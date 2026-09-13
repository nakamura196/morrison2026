/**
 * 検索結果などで出すサムネイル。
 *
 * 画像は東洋文庫の画像サーバ (img.toyobunko-lab.jp) が配信する PTIF から
 * その場で切り出す。請求記号とページ番号だけで URL が決まるので、ES を
 * 作り直しても影響を受けず、`thumbnail_urls` を持たなくてよい。
 *
 * URL の組み立ては libs/iiif-image.ts に集約している。
 */
import { IMAGE_FORMAT, PUBLIC_IMAGE_IIIF_BASE, imageIdentifier, imageServiceUrl } from './iiif-image'

export { imageIdentifier as mediaImageId }

/**
 * 1 ページ分のサムネイル URL。`size` は収まる箱の一辺 (`full/!{size},{size}`)。
 * 請求記号が無いときは空文字を返し、呼び出し側で出し分けられるようにする。
 */
export function mediaThumbUrl(callNumber: string | undefined, page: number | string = 1, size = 300): string {
  if (!callNumber) return ''
  return `${imageServiceUrl(callNumber, page, PUBLIC_IMAGE_IIIF_BASE)}/full/!${size},${size}/0/default.${IMAGE_FORMAT}`
}
