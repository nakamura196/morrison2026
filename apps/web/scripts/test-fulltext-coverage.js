/**
 * 「本文あり」と言っている資料から、本当に本文が出てくるかを確かめる。
 *
 * なぜ必要か (2026-09-11):
 *   詳細画面で本文 (OCR) が出ない資料があった。P-XIV-a-0003 は絞り込みでは
 *   「本文あり」なのに、ビューアに本文の欄が出ず、全文検索にも当たらなかった。
 *
 *   本文の置き場所が 2 つあり、片方しか埋まっていなかったことが原因。
 *     - S3 の TEI        … 全分類にある。has_fulltext はこれを見て立てている
 *     - 検索エンジンの索引 `morrison` … 分類 I・II・III と V の一部だけだった
 *   ビューア・資料内検索・画像内ハイライト・全文検索は後者を読むので、
 *   TEI はあるのに画面には何も出ない、という状態になっていた (約1,900件)。
 *
 *   これは画面の作りではなくデータの食い違いなので、部品ごとの試験
 *   (vitest) では捉えられない。公開されている API だけで確かめられるので、
 *   ここで分類ごとに抜き取り検査する。
 *
 * 何をするか:
 *   1. 「本文あり」で絞り込んだときの分類 (tag1) ごとの件数を取る
 *   2. 分類ごとに数件を抜き取り、その資料の本文が API から返るかを見る
 *      (/api/iiif/3/<請求記号>/annotations/p1 … ビューアが読むのと同じ経路)
 *   3. 1 件も本文が返らない分類があれば、その一覧を出して失敗する
 *
 * 使い方:
 *   BASE_URL=https://morrison.toyobunko-lab.jp node apps/web/scripts/test-fulltext-coverage.js
 *
 *   SAMPLE=3       分類ごとの抜き取り件数 (既定 2)
 *   PAGES=3        1 資料あたり確かめるページ数 (既定 3。表紙だけ文字が無いことがある)
 */

const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!BASE_URL) {
  console.error('BASE_URL env var is required (e.g. https://morrison.toyobunko-lab.jp)');
  process.exit(2);
}

const INDEX = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib';
const SAMPLE = Number(process.env.SAMPLE || 2);
const PAGES = Number(process.env.PAGES || 3);

// API は Basic 認証の対象外だが、将来かかっても動くように付けられるようにする。
const AUTH_USER = process.env.BASIC_AUTH_USER || '';
const AUTH_PASS = process.env.BASIC_AUTH_PASSWORD || '';
const HEADERS = {
  'Content-Type': 'application/json',
  ...(AUTH_USER && AUTH_PASS
    ? { Authorization: 'Basic ' + Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64') }
    : {}),
};

const FULLTEXT_FILTER = { field: 'has_fulltext', values: [true], type: 'all' };

async function search(state, queryConfig = {}) {
  const res = await fetch(`${BASE_URL}/api/${INDEX}/search`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ state, queryConfig }),
  });
  if (!res.ok) throw new Error(`検索 API が ${res.status} を返しました`);
  return res.json();
}

/**
 * その資料の本文が、ビューアの読む経路から返るか。
 *
 * 戻り値の `lines` は、行ごとの位置があるか (2 つ以上の注釈が返るか) を表す。
 * 位置が無いと画像内のハイライトができない。本文があれば合格だが、
 * 位置の有無も出しておき、あとから減っていないかを見られるようにする。
 */
async function hasOcrText(callNumber) {
  for (let page = 1; page <= PAGES; page++) {
    const res = await fetch(
      `${BASE_URL}/api/iiif/3/${encodeURIComponent(callNumber)}/annotations/p${page}`,
      { headers: HEADERS },
    );
    if (!res.ok) continue;
    const body = await res.json();
    if (Array.isArray(body.items) && body.items.length > 0) {
      return { text: true, lines: body.items.length > 1 };
    }
  }
  return { text: false, lines: false };
}

async function main() {
  const groups = await search(
    { searchTerm: '', resultsPerPage: 1, filters: [FULLTEXT_FILTER] },
    { facets: { tag1: { size: 60 } } },
  );
  const total = groups.totalResults ?? 0;
  const buckets = (groups.facets?.tag1?.[0]?.data || []).map(d => ({
    tag1: d.value,
    count: d.count,
  }));

  if (total === 0 || buckets.length === 0) {
    console.error('✗ 「本文あり」の資料が 1 件も返りませんでした (検索エンジンに繋がっていない可能性)');
    process.exit(1);
  }

  console.log(`「本文あり」の資料: ${total.toLocaleString()} 件 / 分類 ${buckets.length} 区分`);
  console.log('');

  const missing = [];
  for (const { tag1, count } of buckets) {
    const found = await search(
      {
        searchTerm: '',
        resultsPerPage: SAMPLE,
        filters: [FULLTEXT_FILTER, { field: 'tag1', values: [tag1], type: 'all' }],
        sortField: 'callNumber_converted',
        sortDirection: 'asc',
      },
      { result_fields: { callNumber: {} } },
    );
    const ids = (found.results || [])
      .map(r => r.callNumber?.raw || r._meta?.id)
      .filter(Boolean);
    const flags = [];
    for (const id of ids) flags.push({ id, ...(await hasOcrText(id)) });
    const ok = flags.filter(f => f.text).length;
    const withLines = flags.filter(f => f.lines).length;
    const mark = ok > 0 ? '✅' : '✗';
    console.log(
      `${mark} ${tag1}  (本文あり ${String(count).padStart(5)} 件)  抜き取り ${ok}/${flags.length}` +
        `  行の位置 ${withLines}/${flags.length}` +
        `  ${flags.map(f => `${f.id}${f.text ? (f.lines ? '' : '(位置なし)') : '(本文なし)'}`).join(' ')}`,
    );
    if (ok === 0) missing.push({ tag1, count, ids });
  }

  console.log('');
  if (missing.length > 0) {
    const affected = missing.reduce((a, m) => a + m.count, 0);
    console.error(
      `✗ ${missing.length} 区分 (「本文あり」計 ${affected.toLocaleString()} 件) で本文が返りません。`,
    );
    console.error('  → 検索エンジンの morrison 索引にページが入っていません。');
    console.error('     scripts/index-ocr-from-tei.py (TEI から) か');
    console.error('     scripts/ocr-apple-vision.py (Mac で OCR し直す) で入れ直してください');
    console.error('     (手順は docs/fulltext-coverage.md)。');
    for (const m of missing) console.error(`     - ${m.tag1} (${m.count} 件): ${m.ids.join(', ')}`);
    process.exit(1);
  }
  console.log('✅ すべての分類で本文が返りました。');
}

main().catch(err => {
  console.error('✗', err.message);
  process.exit(1);
});
