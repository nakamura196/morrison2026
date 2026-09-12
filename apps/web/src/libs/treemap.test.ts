import { describe, expect, it } from 'vitest'
import { squarify } from './treemap'

const WIDTH = 100
const HEIGHT = 60

describe('squarify', () => {
  it('件数のとおりに面積を配る', () => {
    const rects = squarify(
      [
        { key: 'a', value: 3 },
        { key: 'b', value: 1 },
      ],
      WIDTH,
      HEIGHT,
    )
    const areaOf = (key: string) => {
      const r = rects.find((x) => x.item.key === key)!
      return r.width * r.height
    }
    expect(areaOf('a') / areaOf('b')).toBeCloseTo(3, 5)
  })

  it('全体の面積は与えた長方形と等しい', () => {
    const rects = squarify(
      [
        { key: 'a', value: 5224 },
        { key: 'b', value: 638 },
        { key: 'c', value: 511 },
        { key: 'd', value: 18 },
      ],
      WIDTH,
      HEIGHT,
    )
    const total = rects.reduce((sum, r) => sum + r.width * r.height, 0)
    expect(total).toBeCloseTo(WIDTH * HEIGHT, 4)
  })

  it('長方形は与えた枠からはみ出さない', () => {
    const rects = squarify(
      Array.from({ length: 17 }, (_, i) => ({ key: `k${i}`, value: (i + 1) * 11 })),
      WIDTH,
      HEIGHT,
    )
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9)
      expect(r.y).toBeGreaterThanOrEqual(-1e-9)
      expect(r.x + r.width).toBeLessThanOrEqual(WIDTH + 1e-9)
      expect(r.y + r.height).toBeLessThanOrEqual(HEIGHT + 1e-9)
    }
  })

  it('重ならない', () => {
    const rects = squarify(
      [
        { key: 'a', value: 40 },
        { key: 'b', value: 30 },
        { key: 'c', value: 20 },
        { key: 'd', value: 10 },
        { key: 'e', value: 5 },
      ],
      WIDTH,
      HEIGHT,
    )
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]
        const b = rects[j]
        const overlap =
          a.x < b.x + b.width - 1e-9 &&
          b.x < a.x + a.width - 1e-9 &&
          a.y < b.y + b.height - 1e-9 &&
          b.y < a.y + a.height - 1e-9
        expect(overlap).toBe(false)
      }
    }
  })

  it('件数の大きいものから並ぶ', () => {
    const rects = squarify(
      [
        { key: 'small', value: 1 },
        { key: 'big', value: 100 },
      ],
      WIDTH,
      HEIGHT,
    )
    expect(rects[0].item.key).toBe('big')
  })

  it('件数が 0 のものと、空の一覧は置かない', () => {
    expect(squarify([{ key: 'a', value: 0 }], WIDTH, HEIGHT)).toEqual([])
    expect(squarify([], WIDTH, HEIGHT)).toEqual([])
  })
})
