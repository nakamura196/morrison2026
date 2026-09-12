import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BIB_INDEX, PAGE_INDEX } from '@/config/indices'

/**
 * 索引名が 1 か所にまとまっていることを確かめる試験。
 *
 * 2026-09-12 に、ページ単位の本文の索引を `morrison` から `morrison_page` に
 * 改名した。そのとき名前が 9 か所にべた書きされていて、1 つ漏らすと
 * 「検索はできるがハイライトだけ出ない」のような半端な壊れ方をする状態だった。
 *
 * さらに Cloudflare Workers では wrangler.jsonc の `vars` が process.env に
 * 入らないため、**本番で実際に使われるのは config/indices.ts の既定値**。
 * 設定ファイルだけ直しても本番は変わらない。だからここを見張る。
 */

const SRC = join(process.cwd(), 'src')
const ALLOWED = ['src/config/indices.ts']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path)
  }
  return out
}

describe('索引名', () => {
  it('既定は morrison_bib / morrison_page', () => {
    // 環境変数が無いときの値。本番 (Workers) はこの既定値で動く。
    expect(BIB_INDEX).toBe(process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib')
    expect(PAGE_INDEX).toBe(process.env.FULLTEXT_INDEX_NAME || 'morrison_page')
  })

  it('索引名を他のファイルにべた書きしていない', () => {
    const offenders: string[] = []
    for (const file of walk(SRC)) {
      const rel = file.slice(file.indexOf('src/'))
      if (ALLOWED.includes(rel) || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')) continue
      const source = readFileSync(file, 'utf8')
      // コード中の文字列としての索引名 (コメントや例示は対象外にするため、
      // process.env のフォールバックに使われている形だけを見る)
      if (/\|\|\s*['"]morrison/.test(source)) offenders.push(rel)
    }
    expect(offenders, `索引名は @/config/indices から読むこと: ${offenders.join(', ')}`).toEqual([])
  })
})
