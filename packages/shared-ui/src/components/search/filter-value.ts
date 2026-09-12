/**
 * 絞り込みの値を、画面に出す文字に直す。
 *
 * 「画像あり」「本文あり」のような はい/いいえ の項目は、検索エンジンの中では
 * true / false で持っている (古い索引では 1 / 0)。そのまま出すと画面に
 * `true` と英語が出てしまうので、「あり」「なし」に読み替える。
 *
 * 2026-09-11、本文ありで絞り込んだ画面が `has_fulltext: true` と出ていた
 * (項目名も値も生のまま)。項目名はファセットの一覧から引くので
 * (Filters.tsx の labelOf)、ここでは値だけを扱う。
 *
 * アドレス (URL) から復元したときは文字列の "true" / "false" で来ることも
 * あるため、それも見る。いっぽう文字列の "1" / "0" は読み替えない
 * (ふつうの絞り込み値として現れうるので、勝手に「あり」にすると壊れる)。
 */
export function filterValueLabel(
  value: unknown,
  labels: { yes: string; no: string },
): string {
  if (value === true || value === 1 || value === 'true') return labels.yes
  if (value === false || value === 0 || value === 'false') return labels.no
  return String(value)
}
