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
  '/visualize',
  '/en/visualize',
];

// build 時 fetch が落ちて fallback が SSG 化されたときや、検索エンジンに
// 繋がらなかったときに現れる文字列。出ていたら失敗として扱う。
// 可視化ページは集計を取れないと図の代わりにこの 1 行になる (200 で返るため、
// 状態や大きさだけでは気づけない)。
const FAIL_MARKERS = [
  'ただいま集計を取得できませんでした',
  'The figures could not be loaded just now',
];

// 各ページが正しく生成されていれば最低でもこのバイト数を超えるはず。
// 極端に小さい場合は何かが欠落している。
const MIN_BYTES = 5000;

const ANSI = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', dim: '\x1b[2m' };
const color = (c, s) => ANSI[c] + s + ANSI.reset;

async function checkPage(path) {
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
