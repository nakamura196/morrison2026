/**
 * Rendered-page smoke test.
 *
 * Deploy 後に主要ページを GET して、
 *  - HTTP 200 を返す
 *  - レスポンスが極端に小さくない (silent failure 検知)
 * を確認する。
 *
 * ロケールは next-intl の localePrefix: 'as-needed' (apps/web/src/i18n/routing.ts)。
 * defaultLocale=ja は prefix なし (/about)、en は prefix あり (/en/about)。
 *
 * 正式公開まで Basic 認証がかかっている (apps/web/src/middleware.ts)。
 * BASIC_AUTH_USER / BASIC_AUTH_PASSWORD があれば付けて取りにいく。
 * 無ければ付けない (認証を外したあともそのまま動く)。
 *
 * 使い方:
 *   BASE_URL=https://morrison.toyobunko-lab.jp node apps/web/scripts/test-pages.js
 */

const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!BASE_URL) {
  console.error('BASE_URL env var is required (e.g. https://morrison.toyobunko-lab.jp)');
  process.exit(2);
}

const AUTH_USER = process.env.BASIC_AUTH_USER || '';
const AUTH_PASS = process.env.BASIC_AUTH_PASSWORD || '';
const AUTH_HEADERS =
  AUTH_USER && AUTH_PASS
    ? { Authorization: 'Basic ' + Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64') }
    : {};

// path だけ、または { path, requires } で書く。
// requires はそのページの HTML に必ず入っているべき文字列。
const PAGES = [
  '/',
  '/en',
  '/about',
  '/en/about',
  '/search',
  '/en/search',
  '/fulltext-search',
  '/en/fulltext-search',
  '/news',
  '/en/news',
  // 可視化ページは集計を検索エンジンから取る。繋がらなくても 200 で返り、
  // 図の代わりに 1 行の断りが出るだけなので、状態と大きさでは気づけない。
  // 図が組み上がったときにだけ出る目印で見る。
  { path: '/visualize', requires: 'id="classification"' },
  { path: '/en/visualize', requires: 'id="classification"' },
];

// build 時 fetch が落ちて fallback が SSG 化されたときに現れるマーカー文字列。
// morrison では現状該当マーカーは無いため空。必要になったら追加する。
//
// 「失敗時に出る文言」をここに足してはいけない。画面の文言は next-intl の
// 翻訳一式として全ページの HTML に載るため、出ていないページでも見つかる
// (2026-09-11、可視化ページの断り文を入れて 12 ページ全部が失敗した)。
// 失敗を捉えたいときは、上の requires で「成功時にだけ出るもの」を見る。
const FAIL_MARKERS = [];

// 各ページが正しく生成されていれば最低でもこのバイト数を超えるはず。
// 極端に小さい場合は何かが欠落している。
const MIN_BYTES = 5000;

const ANSI = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', dim: '\x1b[2m' };
const color = (c, s) => ANSI[c] + s + ANSI.reset;

async function checkPage(page) {
  const { path, requires } = typeof page === 'string' ? { path: page } : page;
  const url = BASE_URL + path;
  let res;
  try {
    res = await fetch(url, { redirect: 'follow', headers: AUTH_HEADERS });
  } catch (e) {
    return { path, ok: false, reason: `fetch error: ${e.message}` };
  }

  if (res.status === 401) {
    // 認証がかかっているのに鍵を渡せていない。ページの不具合ではないので
    // 取り違えないよう、はっきり書く。
    return {
      path,
      ok: false,
      reason: AUTH_HEADERS.Authorization
        ? 'status 401 (ID かパスワードが違います)'
        : 'status 401 (BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が渡っていません)',
    };
  }

  if (!res.ok) {
    return { path, ok: false, reason: `status ${res.status}` };
  }

  const html = await res.text();
  const marker = FAIL_MARKERS.find((m) => html.includes(m));
  if (marker) {
    return { path, ok: false, reason: `contains fail marker: "${marker}"` };
  }

  if (html.length < MIN_BYTES) {
    return { path, ok: false, reason: `body too small (${html.length}B < ${MIN_BYTES}B)` };
  }

  if (requires && !html.includes(requires)) {
    return { path, ok: false, reason: `missing required content: "${requires}"` };
  }

  return { path, ok: true, status: res.status, bytes: html.length };
}

(async () => {
  console.log(color('dim', `Base URL: ${BASE_URL}`));
  console.log(color('dim', `Pages:    ${PAGES.length}`));
  console.log('');

  const results = await Promise.all(PAGES.map(checkPage));
  let failed = 0;
  for (const r of results) {
    if (r.ok) {
      console.log(`${color('green', 'OK  ')} ${r.path}  ${color('dim', `(${r.bytes}B)`)}`);
    } else {
      failed++;
      console.error(`${color('red', 'FAIL')} ${r.path}  ${r.reason}`);
    }
  }

  console.log('');
  if (failed) {
    console.error(color('red', `${failed} / ${results.length} pages failed`));
    process.exit(1);
  }
  console.log(color('green', `All ${results.length} pages OK`));
})();
