import { describe, expect, it, vi } from 'vitest'
import { listPages } from './manifest-pages'

const size = { width: 10, height: 20 }

describe('listPages', () => {
  it('一覧どおりに展開し、欠番はそのまま残す', async () => {
    const probe = vi.fn(async () => null)
    const pages = await listPages([[1, 2, 10, 20], [4, 1, 30, 40]], probe)
    expect(pages).toEqual([
      { page: 1, width: 10, height: 20 },
      { page: 2, width: 10, height: 20 },
      { page: 4, width: 30, height: 40 },
    ])
    // 一覧の後ろ (5〜12 ページ) を 1 束だけ確かめて終わる
    expect(probe).toHaveBeenCalledTimes(8)
    expect(probe).toHaveBeenCalledWith(5)
    expect(probe).toHaveBeenCalledWith(12)
  })

  it('一覧より後ろに足されたページを拾う', async () => {
    const probe = vi.fn(async (page: number) => (page === 3 || page === 4 ? size : null))
    const pages = await listPages([[1, 2, 10, 20]], probe)
    expect(pages.map(p => p.page)).toEqual([1, 2, 3, 4])
    // 3〜10 で見つかったので、次の束 (11〜18) も確かめる
    expect(probe).toHaveBeenCalledTimes(16)
  })

  it('一覧に無い資料は 1 ページ目から探す', async () => {
    const probe = vi.fn(async (page: number) => (page <= 3 ? size : null))
    const pages = await listPages(undefined, probe)
    expect(pages.map(p => p.page)).toEqual([1, 2, 3])
  })

  it('問い合わせは上限 (40 回) で打ち切る', async () => {
    const probe = vi.fn(async () => size)
    const pages = await listPages(undefined, probe)
    expect(probe).toHaveBeenCalledTimes(40)
    expect(pages).toHaveLength(40)
  })
})
