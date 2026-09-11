/**
 * Basic 認証の試験。
 *
 * 正式公開まで関係者だけが見られる状態にするためのもの。設定が無いときに
 * 誤って全体が閉じたり、逆に鍵をかけたつもりで開いたままだったりすると
 * 気づきにくいので、そこを押さえる。
 */

import { describe, expect, it } from 'vitest'
import { isAuthorized, isOpenPath, parseBasicAuth, safeEqual, unauthorizedResponse } from './basic-auth'

const enc = (u: string, p: string) => 'Basic ' + btoa(`${u}:${p}`)

describe('parseBasicAuth', () => {
  it('ID とパスワードに分解する', () => {
    expect(parseBasicAuth(enc('taro', 'pw12'))).toEqual({ user: 'taro', password: 'pw12' })
  })

  it('パスワードにコロンが入っていても切り間違えない', () => {
    expect(parseBasicAuth(enc('taro', 'a:b:c'))).toEqual({ user: 'taro', password: 'a:b:c' })
  })

  it('ヘッダが無い・壊れているときは null', () => {
    expect(parseBasicAuth(null)).toBeNull()
    expect(parseBasicAuth('Bearer xyz')).toBeNull()
    expect(parseBasicAuth('Basic ****')).toBeNull()
    // コロンで区切られていない中身
    expect(parseBasicAuth('Basic ' + btoa('no-colon-here'))).toBeNull()
  })
})

describe('safeEqual', () => {
  it('同じなら true、違えば false', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'ab')).toBe(false)
  })
})

describe('isAuthorized', () => {
  const expected = { user: 'toyo', password: 'pw12' }

  it('一致すれば通す', () => {
    expect(isAuthorized(enc('toyo', 'pw12'), expected)).toBe(true)
  })

  it('どちらかが違えば通さない', () => {
    expect(isAuthorized(enc('toyo', 'xxxx'), expected)).toBe(false)
    expect(isAuthorized(enc('xxxx', 'pw12'), expected)).toBe(false)
    expect(isAuthorized(null, expected)).toBe(false)
  })
})

describe('閉じない道', () => {
  it('外部提供 API は認証をかけない（機械向けのため）', () => {
    expect(isOpenPath('/api/iiif/3/P-I-a-0001/manifest')).toBe(true)
    expect(isOpenPath('/api/dts/document')).toBe(true)
  })

  it('共有カードやファビコンもかけない', () => {
    expect(isOpenPath('/opengraph-image.png')).toBe(true)
    expect(isOpenPath('/robots.txt')).toBe(true)
  })

  it('画面は認証の対象', () => {
    expect(isOpenPath('/')).toBe(false)
    expect(isOpenPath('/search')).toBe(false)
    expect(isOpenPath('/item/P-I-a-0001')).toBe(false)
    // `/api-docs` は画面。`/api/` と取り違えないこと
    expect(isOpenPath('/api-docs')).toBe(false)
  })
})

describe('認証を求める応答', () => {
  it('401 と、旧 Omeka 版と同じ文言を返す', () => {
    const res = unauthorizedResponse()
    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toContain('Please enter your ID and Password.')
  })

  it('保存させない', () => {
    expect(unauthorizedResponse().headers.get('Cache-Control')).toBe('no-store')
  })
})
