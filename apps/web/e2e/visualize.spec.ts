import { expect, test } from '@playwright/test'

/**
 * 可視化ページをブラウザで見て確かめる試験。
 *
 * 図は描画されて初めて形になるので、部品ごとの試験 (vitest) では
 * 「区画が枠からはみ出していないか」「押した先が検索になっているか」を捉えられない。
 *
 * 集計は検索エンジンから取るため、接続情報の無い場所ではページが
 * 「集計を取得できませんでした」の 1 行になる。その場合は図の試験を飛ばし、
 * ページの骨組みだけを確かめる。
 */

/** 集計が取れているか (取れていなければ図の試験は飛ばす)。 */
async function hasStats(page: import('@playwright/test').Page): Promise<boolean> {
  return (await page.locator('#classification').count()) > 0
}

test.describe('可視化ページ', () => {
  test('ヘッダーから行ける', async ({ page }) => {
    // 検索画面から出発しない。Search UI は検索のあと 0.5 秒ほど遅れて URL を
    // 書き戻すので、その間に別の画面へ移ると URL を引き戻されることがある。
    await page.goto('/en')
    await page.getByRole('link', { name: 'Visualizations' }).first().click()
    await expect(page).toHaveURL(/\/en\/visualize/)
    await expect(page.getByRole('heading', { name: 'Visualizations', level: 1 })).toBeVisible()
  })

  test('日本語でも英語でも見出しが出る', async ({ page }) => {
    await page.goto('/visualize')
    await expect(page.getByRole('heading', { name: '可視化', level: 1 })).toBeVisible()
  })

  test('図が並んでいる', async ({ page }) => {
    await page.goto('/en/visualize')
    test.skip(!(await hasStats(page)), '検索エンジンに繋がらないため図が出ていない')

    for (const id of ['#classification', '#years', '#entities', '#authors', '#coverage']) {
      await expect(page.locator(id)).toBeVisible()
    }
  })

  test('分類の区画を押すと、その分類で絞り込んだ検索に移る', async ({ page }) => {
    await page.goto('/en/visualize')
    test.skip(!(await hasStats(page)), '検索エンジンに繋がらないため図が出ていない')

    await page.locator('#classification a').first().click()
    await expect(page).toHaveURL(/\/en\/search\?/)
    expect(decodeURIComponent(page.url())).toMatch(/filters\[0\]\[field\]=(tag1|callNumber)/)
  })

  test('出版年の棒を押すと、その年で絞り込んだ検索に移る', async ({ page }) => {
    await page.goto('/en/visualize')
    test.skip(!(await hasStats(page)), '検索エンジンに繋がらないため図が出ていない')

    await page.locator('#years a').first().click()
    await expect(page).toHaveURL(/\/en\/search\?/)
    expect(decodeURIComponent(page.url())).toContain('filters[0][field]=publication_year')
  })

  test('固有表現を押すと全文検索に移る', async ({ page }) => {
    await page.goto('/en/visualize')
    test.skip(!(await hasStats(page)), '検索エンジンに繋がらないため図が出ていない')

    const first = page.locator('#entities a').first()
    if ((await first.count()) === 0) test.skip(true, '固有表現がまだ入っていない')
    await first.click()
    await expect(page).toHaveURL(/\/en\/fulltext-search\?/)
    expect(decodeURIComponent(page.url())).toContain('filters[0][field]=ne_')
  })

  test('区画が枠からはみ出していない', async ({ page }) => {
    await page.goto('/en/visualize')
    test.skip(!(await hasStats(page)), '検索エンジンに繋がらないため図が出ていない')

    const frame = page.locator('#classification a').first()
    const box = await frame.boundingBox()
    const card = await page.locator('#classification').boundingBox()
    expect(box).not.toBeNull()
    expect(card).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(card!.x - 1)
    expect(box!.x + box!.width).toBeLessThanOrEqual(card!.x + card!.width + 1)
  })

  test('横に溢れない (携帯の幅)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/en/visualize')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
