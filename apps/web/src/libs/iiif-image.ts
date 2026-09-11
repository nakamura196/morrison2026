/**
 * 画像を配信している IIIF Image API サーバの URL を組み立てる。
 *
 * 配信元は東洋文庫の画像サーバ (img.toyobunko-lab.jp / iipsrv)。画像の実体は
 * `/opt/images/morrison_p/<group>/<callNumber>/<NNNN>.tif` に置いた PTIF で、
 * IIIF の識別子はその `/opt/images/` からの相対パスになる。
 *
 * 以前の配信元 (media.toyobunko-lab.jp / Cantaloupe) とは URL の作法が 2 点違う。
 * 移行時にどちらも踏んだので、ここに集約して間違えないようにする。
 *
 *  1. 識別子のスラッシュは**そのまま**書く。Cantaloupe は `%2F` に潰す必要が
 *     あったが、iipsrv はパスとして受け取るので `%2F` だと 404 になる。
 *  2. 原寸は `full/full`（IIIF Image API 2 の書き方）。`full/max` は 3 の書き方で、
 *     iipsrv は 400 を返す。
 *
 * iipsrv (2021 ビルド) が返す info.json は Image API 2 のみ。manifest 側の
 * image service も元から 2 で書いているため、そちらの変更は要らない。
 */

/** 既定は東洋文庫の画像サーバ。差し替えたいときだけ環境変数で上書きする。 */
const DEFAULT_BASE = 'https://img.toyobunko-lab.jp/iiif'

/** サーバ側 (manifest / DTS) 用。 */
export const IMAGE_IIIF_BASE = (process.env.MORRISON_MEDIA_IIIF_BASE || DEFAULT_BASE).replace(/\/+$/, '')

/** クライアント側 (検索 UI のサムネイル) 用。NEXT_PUBLIC_ が要る。 */
export const PUBLIC_IMAGE_IIIF_BASE = (
  process.env.NEXT_PUBLIC_MEDIA_IIIF_BASE || DEFAULT_BASE
).replace(/\/+$/, '')

/** 原寸の指定。iipsrv は IIIF Image API 2 なので `max` ではなく `full`。 */
export const FULL_SIZE = 'full'

/** グループ名 = 請求記号の先頭 2 区切り (`P-III-a-0083` → `P-III`)。 */
export function deriveGroup(callNumber: string): string {
  return callNumber.split('-').slice(0, 2).join('-')
}

/** 画像 1 枚の IIIF 識別子 (`morrison_p/<group>/<callNumber>/<NNNN>.tif`)。 */
export function imageIdentifier(callNumber: string, page: number | string = 1): string {
  return `morrison_p/${deriveGroup(callNumber)}/${callNumber}/${String(page).padStart(4, '0')}.tif`
}

/**
 * 識別子を URL に載せる。区切りのスラッシュは残したまま、各区切りの中だけを
 * エンコードする。請求記号に丸括弧が入るもの (`P-III-a-1999(5)`) があるため、
 * 素の連結では済ませない。
 */
export function encodeIdentifier(identifier: string): string {
  return identifier.split('/').map(encodeURIComponent).join('/')
}

/** 画像 1 枚の IIIF Image API サービス URL (info.json の 1 つ上)。 */
export function imageServiceUrl(callNumber: string, page: number | string = 1, base = IMAGE_IIIF_BASE): string {
  return `${base}/${encodeIdentifier(imageIdentifier(callNumber, page))}`
}
