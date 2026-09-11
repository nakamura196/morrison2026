import { expect, test } from '@playwright/test'

/**
 * 検索画面をブラウザで見て確かめる試験。
 *
 * ここで押さえているのは、部品ごとの試験では捉えられなかった壊れ方:
 *   - 絞り込み中の表示に見出しが出ず `: travel` になっていた
 *     (見出しをファセットの一覧から引いていたが、項目別の絞り込みは
 *      ファセットではないので引けなかった。部品の継ぎ目で起きる不具合)
 *   - 詳細検索の枠が検索ボックスに接して一体に見えていた
 */

/** タイトルに `travel` を指定した状態の検索画面。 */
const TITLE_FILTER_URL =
  '/en/search?size=n_20_n' +
  '&filters%5B0%5D%5Bfield%5D=title' +
  '&filters%5B0%5D%5Bvalues%5D%5B0%5D=travel' +
  '&filters%5B0%5D%5Btype%5D=all' +
  '&sort-field=callNumber_converted&sort-direction=asc'

test.describe('項目を指定して絞り込む欄', () => {
  test('検索画面に欄が出ている', async ({ page }) => {
    await page.goto('/en/search')
    await expect(page.getByRole('button', { name: /Search by field/i })).toBeVisible()
  })

  test('開くと 4 つの入力欄が出る', async ({ page }) => {
    await page.goto('/en/search')
    await page.getByRole('button', { name: /Search by field/i }).click()
    for (const label of ['Title', 'Author', 'Publication', 'Call number']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
  })

  test('URL の絞り込みが入力欄に復元される', async ({ page }) => {
    await page.goto(TITLE_FILTER_URL)
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('travel')
  })

  test('検索ボックスと詰まって表示されない', async ({ page }) => {
    await page.goto('/en/search')
    const box = page.locator('input[type="search"], input[placeholder*="Search"]').first()
    const panel = page.getByRole('button', { name: /Search by field/i })
    const boxRect = await box.boundingBox()
    const panelRect = await panel.boundingBox()
    expect(boxRect).not.toBeNull()
    expect(panelRect).not.toBeNull()
    // 枠が接していると一体に見えるので、間を空けておく。
    const gap = panelRect!.y - (boxRect!.y + boxRect!.height)
    expect(gap).toBeGreaterThan(8)
  })
})

test.describe('絞り込み中の表示', () => {
  test('見出しが空欄にならない', async ({ page }) => {
    await page.goto(TITLE_FILTER_URL)
    const chip = page.locator('button', { hasText: 'travel' }).first()
    await expect(chip).toBeVisible()
    const text = ((await chip.textContent()) || '').replace(/\s+/g, ' ').trim()
    // `: travel` のように見出しが落ちていないこと。
    expect(text.startsWith(':')).toBe(false)
    expect(text).toContain('Title')
    expect(text).toContain('travel')
  })
})

test.describe('並び替え', () => {
  test('請求記号は変換後の項目で並べる', async ({ page }) => {
    await page.goto('/en/search')
    const select = page.locator('#sort-select')
    await expect(select).toBeVisible()
    const values = await select.locator('option').evaluateAll(os =>
      os.map(o => (o as HTMLOptionElement).value),
    )
    // `callNumber` のままだと P-IV の次が P-IX になる。
    expect(values).toContain('callNumber_converted_asc')
    expect(values).toContain('callNumber_converted_desc')
    expect(values).not.toContain('callNumber_asc')
  })

  test('既定は請求記号の昇順', async ({ page }) => {
    await page.goto('/en/search')
    await expect(page.locator('#sort-select')).toHaveValue('callNumber_converted_asc')
  })
})
