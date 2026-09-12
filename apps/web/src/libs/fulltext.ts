/**
 * この資料に本文 (OCR で起こした文字) があるか。
 *
 * 本文は 2 か所にある。置き場所ごとに、できることが違う。
 *
 *  - S3 の TEI (`xml/morrison_p/<group>/<callNumber>/tei.xml`)
 *    本文の正本。TEI/XML のダウンロード (DTS の Document) はここから返す。
 *    検索エンジン (morrison_bib) の `has_fulltext` は、この TEI の在否で
 *    立てている (scripts/set-has-fulltext.py)。
 *
 *  - 検索エンジンの `morrison` 索引 (ページ単位の本文 + 行の座標)
 *    ビューアの本文表示・資料内の本文検索・画像内のハイライト・全文検索は
 *    こちらを読む。ALTO から作る (scripts/reindex-ocr-from-alto.py)。
 *
 * この 2 つは一致しているべきだが、2026-09-11 に食い違いが見つかった。
 * TEI は全分類にあるのに、`morrison` 索引は I・II・III と V の一部しか
 * 入っておらず、`has_fulltext=true` でも本文が出ない資料が約 1,900 件あった。
 * そのとき詳細画面は `morrison` 索引の在否だけを見ていたため、TEI が
 * あるのにダウンロードの入口まで消えていた。
 *
 * そこで、ダウンロードの可否は **検索エンジンの `has_fulltext`** で決める。
 * 古い資料 (フラグがまだ無いもの) に備えて、フラグが無いときだけページの
 * 本文から判断する。
 */

/** ページ単位の本文 (morrison 索引から取ったもの) のうち、ここで見る部分。 */
interface PageText {
  text?: string | null
}

export function itemHasFulltext(
  item: { has_fulltext?: boolean | null },
  ocrPages: PageText[] = [],
): boolean {
  if (typeof item.has_fulltext === 'boolean') return item.has_fulltext
  return ocrPages.some(p => (p.text?.trim().length ?? 0) > 0)
}
