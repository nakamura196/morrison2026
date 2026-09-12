/**
 * 検索エンジン (Elasticsearch) の索引名。**ここが唯一の正解**。
 *
 * 名前の付け方は `<案件>_<役割>`。役割は item / bib / page / media など決まった語を使う
 * (docs/es-index-naming.md)。2026-09-12 に、ページ単位の本文の索引を
 * `morrison` から `morrison_page` に改名した。他の案件が同じ役割を
 * `genji_page` `hi_page` `kano_page` と呼んでいるのに、morrison だけ
 * 案件名そのままで、何が入っているか名前から分からなかったため。
 *
 * ⚠ Cloudflare Workers (OpenNext) では wrangler.jsonc の `vars` は
 * process.env に入らない。本番で実際に使われるのは**この既定値**で、
 * 環境変数はローカル開発と各スクリプト用。だから名前を変えるときは、
 * ここを変えて配布する必要がある (wrangler.jsonc の vars だけでは変わらない)。
 */

/** 書誌 (1 資料 = 1 doc)。_id は請求記号。 */
export const BIB_INDEX = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

/** ページ単位の本文 + 行の座標 (1 ページ = 1 doc)。正本は S3 の TEI。 */
export const PAGE_INDEX = process.env.FULLTEXT_INDEX_NAME || 'morrison_page'
