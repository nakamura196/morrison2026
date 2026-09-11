/**
 * 言語の振り分けの試験。
 *
 * 2026-09-10、英語ページから「日本語」に切り替えたあと別のページへ移ると、
 * 英語版に戻ってしまう不具合があった。切り替えた直後に、英語ページの資料リンクの
 * 先読み (/en/item/...) が走り、その応答で cookie (NEXT_LOCALE) が en に
 * 上書きされる。cookie が en だと、接頭辞のない日本語の URL が /en へ転送されていた。
 *
 * いまは URL だけで言語を決める (/en/... は英語、それ以外は日本語)。
 * cookie やブラウザの言語設定で転送しないことを、ここで押さえる。
 */

import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { middleware } from './middleware'

function request(path: string, headers: Record<string, string> = {}) {
  return middleware(new NextRequest(`http://localhost${path}`, { headers }))
}

describe('接頭辞のない URL は日本語のまま表示する', () => {
  const paths = ['/', '/about', '/search?size=n_20_n&sort-field=callNumber_converted&sort-direction=asc']

  it('cookie が en でも /en へ転送しない', () => {
    for (const path of paths) {
      const res = request(path, { cookie: 'NEXT_LOCALE=en' })
      expect(res.headers.get('location')).toBeNull()
      expect(res.headers.get('x-middleware-rewrite')).toContain('/ja')
    }
  })

  it('ブラウザの言語設定が英語でも /en へ転送しない', () => {
    for (const path of paths) {
      const res = request(path, { 'accept-language': 'en-US,en;q=0.9' })
      expect(res.headers.get('location')).toBeNull()
      expect(res.headers.get('x-middleware-rewrite')).toContain('/ja')
    }
  })
})

describe('/en で始まる URL は英語のまま表示する', () => {
  it('cookie が ja でも日本語へ転送しない', () => {
    const res = request('/en/about', { cookie: 'NEXT_LOCALE=ja' })
    expect(res.headers.get('location')).toBeNull()
  })
})
