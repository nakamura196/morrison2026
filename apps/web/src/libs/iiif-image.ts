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
 * 画像サーバは 2026-09-14 に iipsrv 1.2 へ更新し、次の状態になっている。
 *   - `/iiif/` は Image API 2 を返す (`IIIF_VERSION "2"` で固定)。manifest の
 *     image service も 2 のままなので、そちらの変更は要らない
 *   - `/iiif3/` は Image API 3 を返す (v3 のクライアント向け)
 *   - 出力形式は jpg / png / webp。WebP は JPEG より小さい (実測: タイル
 *     512x512 が 3,713 → 937 バイト。これは既定の品質どうしの比較で、品質の
 *     数値を 90 に揃えても約 26% 減)
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

/**
 * サムネイルとタイルに使う画像形式。
 *
 * WebP は JPEG より小さく (実測で元の 25〜45%)、対応していないブラウザは
 * ほぼ無いが、切り戻せるように 1 か所にまとめて環境変数で変えられるようにする。
 * `jpg` に戻すときは `NEXT_PUBLIC_IMAGE_FORMAT=jpg` を設定して配布する。
 *
 * ビューア (OpenSeadragon) 側は info.json に `preferredFormats` を足して渡す
 * 形にしている。OSD 6.0.2 は `preferredFormats` を見て `tileFormat` を決めるが、
 * 「使えるか」の判定は固定表 (`FILEFORMATS`) で、ブラウザの実機能は見ていない
 * (openseadragon.js の imageFormatSupported)。WebP は Safari 14 (2020) 以降
 * すべての現行ブラウザが表示できるので実害はないが、自動では jpg に落ちない。
 */
export const IMAGE_FORMAT = (process.env.NEXT_PUBLIC_IMAGE_FORMAT || 'webp') as 'webp' | 'jpg'

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
