import { defineConfig, devices } from '@playwright/test'

/**
 * ブラウザで実際の画面を見る試験の設定。
 *
 * 部品ごとの試験 (vitest) は入力から出力が決まる処理しか見ないので、
 * 描画されたあとのこと — 文字が空欄になっていないか、要素が重なっていないか —
 * は捉えられない。実際、項目別の絞り込みを入れたときに
 *   - 絞り込み中の表示が `: travel` と見出しなしになる
 *   - 検索ボックスと詳細検索の枠が接して一体に見える
 * という 2 つを取りこぼした。どちらも部品単体は正しく、組み合わせたときだけ
 * 現れるもので、ここでしか捉えられない。
 *
 * 既定ではローカルに立てた本番相当のサーバを見る。検索結果の取得には
 * Elasticsearch への接続情報が要るが、URL から復元される絞り込みの表示や
 * 画面の組み立ては、接続情報が無くても確かめられる。
 *
 * 使い方:
 *   npm run build && npm run test:e2e
 *   E2E_BASE_URL=https://morrison.toyobunko-lab.jp npm run test:e2e   # 本番を見る
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3111',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // 外のサーバを見るときは自分で起動しない。
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npx next start -p 3111',
        url: 'http://localhost:3111',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
