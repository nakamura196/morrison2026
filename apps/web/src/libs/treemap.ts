/**
 * 面積の図 (treemap) の配置計算。
 *
 * 件数を面積に変えて長方形に敷き詰める。並べ方は squarified 法 — なるべく正方形に
 * 近い形になるよう詰めるやり方で、細長い短冊になって読めなくなるのを防ぐ。
 * 参考: Bruls, Huizing, van Wijk (2000) "Squarified Treemaps"。
 *
 * 画面の都合を持ち込まない純粋な計算にしてある (0〜1 の比率ではなく、渡された幅と
 * 高さの単位でそのまま返す)。試験しやすく、SVG でも HTML でも同じものを使える。
 */

export interface TreemapItem {
  key: string
  value: number
}

export interface TreemapRect<T extends TreemapItem = TreemapItem> {
  item: T
  x: number
  y: number
  width: number
  height: number
}

function area(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

/**
 * 1 列に並べたときの「いちばん悪い縦横比」。小さいほど正方形に近い。
 * これが増えるところで列を打ち切る。
 */
function worstRatio(areas: number[], side: number): number {
  if (areas.length === 0) return Infinity
  const total = area(areas)
  const max = Math.max(...areas)
  const min = Math.min(...areas)
  if (total <= 0 || min <= 0 || side <= 0) return Infinity
  return Math.max((side * side * max) / (total * total), (total * total) / (side * side * min))
}

/** 詰め終わった 1 列を実際の座標に変換し、残りの空き領域を返す。 */
function placeRow<T extends TreemapItem>(
  row: { item: T; area: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  out: TreemapRect<T>[],
): { x: number; y: number; width: number; height: number } {
  const total = area(row.map((r) => r.area))
  if (total <= 0) return { x, y, width, height }

  if (width >= height) {
    // 縦に積む列を左から置く
    const colWidth = total / height
    let cursor = y
    for (const r of row) {
      const h = r.area / colWidth
      out.push({ item: r.item, x, y: cursor, width: colWidth, height: h })
      cursor += h
    }
    return { x: x + colWidth, y, width: width - colWidth, height }
  }

  // 横に並べる行を上から置く
  const rowHeight = total / width
  let cursor = x
  for (const r of row) {
    const w = r.area / rowHeight
    out.push({ item: r.item, x: cursor, y, width: w, height: rowHeight })
    cursor += w
  }
  return { x, y: y + rowHeight, width, height: height - rowHeight }
}

/**
 * 件数の一覧を、指定した大きさの長方形に敷き詰める。
 * 件数 0 以下のものは置かない。返る順序は面積の大きい順。
 */
export function squarify<T extends TreemapItem>(
  items: T[],
  width: number,
  height: number,
): TreemapRect<T>[] {
  const out: TreemapRect<T>[] = []
  const usable = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  const total = area(usable.map((i) => i.value))
  if (total <= 0 || width <= 0 || height <= 0) return out

  const scale = (width * height) / total
  const queue = usable.map((item) => ({ item, area: item.value * scale }))

  let x = 0
  let y = 0
  let w = width
  let h = height
  let row: { item: T; area: number }[] = []

  while (queue.length > 0) {
    const next = queue[0]
    const side = Math.min(w, h)
    const current = row.map((r) => r.area)

    if (row.length === 0 || worstRatio(current, side) >= worstRatio([...current, next.area], side)) {
      row.push(queue.shift() as { item: T; area: number })
      continue
    }

    const rest = placeRow(row, x, y, w, h, out)
    x = rest.x
    y = rest.y
    w = rest.width
    h = rest.height
    row = []
  }

  if (row.length > 0) placeRow(row, x, y, w, h, out)

  return out
}
