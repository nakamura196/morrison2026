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
 * 使い方:
 *   BASE_URL=https://morrison.toyobunko-lab.jp node apps/web/scripts/test-pages.js
 */

const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!BASE_URL) {
  console.error('BASE_URL env var is required (e.g. https://morrison.toyobunko-lab.jp)');
  process.exit(2);
}

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
];

// build 時 fetch が落ちて fallback が SSG 化されたときに現れるマーカー文字列。
// morrison では現状該当マーカーは無いため空。必要になったら追加する。
const FAIL_MARKERS = [];

// 各ページが正しく生成されていれば最低でもこのバイト数を超えるはず。
// 極端に小さい場合は何かが欠落している。
const MIN_BYTES = 5000;

const ANSI = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', dim: '\x1b[2m' };
const color = (c, s) => ANSI[c] + s + ANSI.reset;

async function checkPage(path) {
  const url = BASE_URL + path;
  let res;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch (e) {
    return { path, ok: false, reason: `fetch error: ${e.message}` };
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
