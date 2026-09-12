import { describe, expect, it } from 'vitest'
import { itemHasFulltext } from '@/libs/fulltext'

/**
 * 本文 (TEI) のダウンロードを出すかどうかの判断。
 *
 * 2026-09-11、詳細画面はページ単位の本文 (morrison 索引) の在否だけを見ていた。
 * 索引は分類 I・II・III と V の一部しか入っていなかったので、TEI がある
 * 約1,900件で、TEI/XML のダウンロードの入口まで消えていた。
 */

describe('itemHasFulltext', () => {
  it('検索エンジンの has_fulltext を優先する', () => {
    expect(itemHasFulltext({ has_fulltext: true }, [])).toBe(true)
    expect(itemHasFulltext({ has_fulltext: false }, [{ text: 'ある' }])).toBe(false)
  })

  it('ページ単位の本文が無くても、has_fulltext が true なら本文ありとする', () => {
    // これが 2026-09-11 の不具合。P-XIV-a-0003 は TEI があるのに入口が消えていた。
    expect(itemHasFulltext({ has_fulltext: true }, [])).toBe(true)
  })

  it('has_fulltext が無い資料は、ページ単位の本文から判断する', () => {
    expect(itemHasFulltext({}, [{ text: 'THE RISE AND DECLINE OF ISLAM.' }])).toBe(true)
    expect(itemHasFulltext({}, [])).toBe(false)
    expect(itemHasFulltext({}, [{ text: '' }, { text: '   ' }])).toBe(false)
    expect(itemHasFulltext({}, [{}])).toBe(false)
  })

  it('ページの一覧を渡さなくても落ちない', () => {
    expect(itemHasFulltext({})).toBe(false)
  })
})
