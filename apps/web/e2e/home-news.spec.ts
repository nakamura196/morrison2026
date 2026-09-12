import { expect, test } from '@playwright/test'

/**
 * トップページとお知らせの試験。
 *
 * ここで押さえているのは 2 つ:
 *   - トップに「できること」のカードと最新のお知らせが出ていること
 *   - 中身が短いページでも、フッターが画面の下端に着いていること
 *     (以前のトップページは中身を伸ばす指定が無く、画面が高いと
 *      フッターが途中で終わって下が地色のまま空いていた)
 */

test.describe('トップページ', () => {
  test('できること のカードが 4 つ出ている', async ({ page }) => {
    await page.goto('/en')
    for (const title of [
      'Search the catalogue',
      'Search the text',
      'Use it as data',
      'About this database',
    ]) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible()
    }
  })

  test('お知らせが出ていて、一覧へ行ける', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByRole('heading', { name: 'News', exact: true })).toBeVisible()
    await page.getByRole('link', { name: /See all news/i }).click()
    await expect(page).toHaveURL(/\/en\/news$/)
  })
})

test.describe('お知らせ', () => {
  test('一覧から個々のお知らせへ遷移できる', async ({ page }) => {
    await page.goto('/en/news')
    const first = page.locator('main a[href*="/news/"]').first()
    await expect(first).toBeVisible()
    await first.click()
    await expect(page).toHaveURL(/\/en\/news\/.+/)
    // 日付と本文が出ていること。
    await expect(page.locator('main time')).toBeVisible()
    await expect(page.locator('main article')).not.toBeEmpty()
  })
})

test.describe('フッターの位置', () => {
  // 中身が短いページを、縦に長い画面で開く。
  test.use({ viewport: { width: 1280, height: 1400 } })

  for (const path of ['/en', '/en/news']) {
    test(`${path} で画面の下端に着いている`, async ({ page }) => {
      await page.goto(path)
      const footer = page.locator('footer')
      const box = await footer.boundingBox()
      expect(box).not.toBeNull()
      const viewport = page.viewportSize()!
      const docHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      // 画面に収まっているページなら、フッターの下端が画面の下端と一致する。
      if (docHeight <= viewport.height + 1) {
        expect(box!.y + box!.height).toBeGreaterThanOrEqual(viewport.height - 1)
      }
    })
  }
})
