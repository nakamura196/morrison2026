import { expect, test } from '@playwright/test'

/**
 * 「本文あり」で絞り込んだ画面をブラウザで見て確かめる試験。
 *
 * 2026-09-11、可視化ページから「本文あり」で検索に飛ぶと、画面上部の札が
 *   has_fulltext: true
 * と、項目名も値も英語のまま出ていた。ファセットの一覧に has_fulltext が
 * 無かったため見出しが引けず、値も真偽値 (true) を読み替えていなかった。
 *
 * 部品ごとの試験 (config/facets.test.ts, filter-value.test.ts) でも同じことを
 * 見ているが、ここでは画面に出る文字そのものを見る。
 */

const FULLTEXT_FILTER_URL =
  '/search?size=n_24_n' +
  '&filters%5B0%5D%5Bfield%5D=has_fulltext' +
  '&filters%5B0%5D%5Bvalues%5D%5B0%5D=b_true_b' +
  '&filters%5B0%5D%5Btype%5D=all' +
  '&sort-field=callNumber_converted&sort-direction=asc'

test.describe('本文ありの絞り込み', () => {
  test.use({ locale: 'ja-JP', extraHTTPHeaders: { 'Accept-Language': 'ja' } })

  // 検索結果の取得には Elasticsearch が要る。ローカルに立てたサーバを見るときは
  // 検索 API だけ本番へ流して、画面の側の動きを確かめる。
  test.beforeEach(async ({ page, baseURL }) => {
    if (baseURL?.includes('localhost')) {
      await page.route('**/api/*/search', async route => {
        const res = await route.fetch({
          url: 'https://morrison.toyobunko-lab.jp/api/morrison_bib/search',
        })
        await route.fulfill({ response: res })
      })
    }
  })

  test('札に「本文あり: あり」と出る', async ({ page }) => {
    await page.goto(FULLTEXT_FILTER_URL, { waitUntil: 'domcontentloaded' })
    const chip = page.locator('button', { hasText: '本文あり' }).first()
    await expect(chip).toBeVisible()
    const text = ((await chip.textContent()) || '').replace(/\s+/g, ' ').trim()
    expect(text).toContain('本文あり')
    expect(text).toContain('あり')
    // 項目名や真偽値が素のまま出ていないこと。
    expect(text).not.toContain('has_fulltext')
    expect(text).not.toContain('true')
  })

  test('画面のどこにも has_fulltext / true が出ていない', async ({ page }) => {
    await page.goto(FULLTEXT_FILTER_URL, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('button', { hasText: '本文あり' }).first()).toBeVisible()
    const body = ((await page.locator('body').innerText()) || '').replace(/\s+/g, ' ')
    expect(body).not.toContain('has_fulltext')
  })
})
