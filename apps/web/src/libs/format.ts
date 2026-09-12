/**
 * 画面に出す数字の書き方。
 *
 * 3 桁区切りは実行環境の言語設定に任せない。サーバ側と画面側で区切り方が変わると
 * React が組み直しを起こすため、'en-US' に固定する (日本語でも同じ見た目になる)。
 */

const NUMBER_FORMAT = new Intl.NumberFormat('en-US')

export function formatCount(value: number): string {
  return NUMBER_FORMAT.format(value)
}

/** 割合を「88.9%」の形にする。分母が 0 なら 0%。 */
export function formatPercent(part: number, whole: number): string {
  if (whole <= 0) return '0%'
  const pct = (part / whole) * 100
  return `${pct >= 99.95 || Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)}%`
}
