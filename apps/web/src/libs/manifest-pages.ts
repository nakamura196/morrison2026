/**
 * manifest に載せるページ (番号と寸法) を決める。
 *
 * 画像サーバを走査した一覧 (src/data/page-dims.json、scripts/build-page-dims.py
 * が作る) を正本にし、その後ろに足されたページだけを画像サーバへ問い合わせて拾う。
 *
 * 以前は表示のたびに全ページを問い合わせていたが、Cloudflare Workers は 1 回の
 * 処理で外への問い合わせが 50 回までなので、それを超える資料はページが途中で
 * 切れていた (2026-09-10: P-III-a-1912 は 211 ページ中 49)。問い合わせには
 * 上限を置き、ES への 1 回と合わせて 50 回に収める。
 */

export interface PageSize {
  page: number
  width: number
  height: number
}

/** [最初のページ, 枚数, 幅, 高さ] の並び。同じ寸法が続くページを 1 行にまとめたもの。 */
export type PageRuns = readonly (readonly number[])[]

/** 8 枚ずつ調べ、1 束まるごと無ければ終わりとみなす。 */
export const PROBE_BATCH = 8
export const PROBE_BUDGET = 40

export function expandRuns(runs: PageRuns | undefined): PageSize[] {
  const pages: PageSize[] = []
  for (const [first, count, width, height] of runs ?? []) {
    for (let k = 0; k < count; k++) pages.push({ page: first + k, width, height })
  }
  return pages
}

export async function listPages(
  runs: PageRuns | undefined,
  probe: (page: number) => Promise<{ width: number; height: number } | null>,
  { batch = PROBE_BATCH, budget = PROBE_BUDGET } = {},
): Promise<PageSize[]> {
  const pages = expandRuns(runs)
  let next = (pages.length ? pages[pages.length - 1].page : 0) + 1
  for (let used = 0; used + batch <= budget; used += batch) {
    const start = next
    const found = await Promise.all(
      Array.from({ length: batch }, (_, k) =>
        probe(start + k).then(dims => (dims ? { page: start + k, ...dims } : null)),
      ),
    )
    next += batch
    const hits = found.filter((p): p is PageSize => p !== null)
    if (hits.length === 0) break
    pages.push(...hits)
  }
  return pages
}
