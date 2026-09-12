import { describe, expect, it } from 'vitest'
import ja from '@/messages/ja.json'
import en from '@/messages/en.json'
import {
  ADVANCED_FIELDS,
  advancedFilterLabels,
  fulltextFacetOptions,
  searchFacetOptions,
} from '@/config/facets'
import {
  authorHref,
  callNumberPrefixHref,
  classificationFulltextHref,
  classificationHref,
  entityHref,
  flagHref,
  publicationYearHref,
} from '@/libs/search-link'

/**
 * 絞り込みの見出しが「項目名のまま」出てしまう不具合を捉える試験。
 *
 * 2026-09-11、可視化ページの「本文あり」から検索へ飛ぶと、画面上部の札が
 * `has_fulltext: true` と出ていた。絞り込みの見出しはファセットの一覧から
 * 引くのに、has_fulltext がその一覧に無かったため。
 *
 * リンクを作る側 (libs/search-link.ts) と、見出しを持つ側 (config/facets.ts)
 * が別のファイルなので、片方だけ足すと今後も同じことが起きる。ここで
 * 「リンクで渡しうる項目はすべて見出しを持つ」を固定する。
 */

/** messages を引く翻訳関数。無い鍵は投げる (next-intl も本番で同様に落ちる)。 */
function translator(messages: Record<string, Record<string, string>>, section: string) {
  return (key: string): string => {
    const value = messages[section]?.[key]
    if (!value) throw new Error(`messages の ${section}.${key} がありません`)
    return value
  }
}

/** 検索ページへのリンクから、絞り込みの項目名を取り出す。 */
function fieldsOf(href: string): string[] {
  const query = href.slice(href.indexOf('?') + 1)
  const fields: string[] = []
  new URLSearchParams(query).forEach((value, key) => {
    if (/^filters\[\d+\]\[field\]$/.test(key)) fields.push(value)
  })
  return fields
}

const locales = { ja, en } as unknown as Record<string, Record<string, Record<string, string>>>

describe('検索ページへのリンクは、すべて見出しを持つ', () => {
  const bibHrefs = [
    classificationHref('III. CHINA'),
    callNumberPrefixHref('P-III-a'),
    publicationYearHref(['1904']),
    authorHref('Muir, William, Sir.'),
    classificationFulltextHref('III. CHINA'),
    flagHref('has_image', true),
    flagHref('has_fulltext', true),
  ]
  const fulltextHrefs = [
    entityHref('ne_persName', 'Confucius'),
    entityHref('ne_placeName', 'Peking'),
    entityHref('ne_orgName', 'Royal Asiatic Society'),
    entityHref('ne_date', '1887'),
  ]

  for (const locale of ['ja', 'en']) {
    const messages = locales[locale]
    const tFacet = translator(messages, 'Facet')
    const tSearch = translator(messages, 'SearchPage')
    const tFulltext = translator(messages, 'FulltextSearchPage')

    it(`検索画面 (${locale})`, () => {
      const labels = new Map<string, string>([
        ...searchFacetOptions(tFacet).map(o => [o.field, o.label] as const),
        ...Object.entries(advancedFilterLabels(tSearch)),
      ])
      for (const href of bibHrefs) {
        for (const field of fieldsOf(href)) {
          expect(labels.get(field), `${field} の見出しが無い (${href})`).toBeTruthy()
          expect(labels.get(field)).not.toBe(field)
        }
      }
    })

    it(`全文検索画面 (${locale})`, () => {
      const labels = new Map(
        fulltextFacetOptions(tFulltext, tFacet).map(o => [o.field, o.label] as const),
      )
      for (const href of fulltextHrefs) {
        for (const field of fieldsOf(href)) {
          expect(labels.get(field), `${field} の見出しが無い (${href})`).toBeTruthy()
          expect(labels.get(field)).not.toBe(field)
        }
      }
    })
  }
})

describe('見出しの中身', () => {
  it('本文あり (has_fulltext) が検索画面のファセットに入っている', () => {
    const options = searchFacetOptions(translator(locales.ja, 'Facet'))
    const hit = options.find(o => o.field === 'has_fulltext')
    expect(hit?.label).toBe('本文あり')
  })

  it('日本語と英語で同じ項目が揃っている', () => {
    const fields = (locale: string) =>
      searchFacetOptions(translator(locales[locale], 'Facet')).map(o => o.field)
    expect(fields('ja')).toEqual(fields('en'))
  })

  it('項目を指定して絞り込む欄の見出しも messages にある', () => {
    for (const locale of ['ja', 'en']) {
      const labels = advancedFilterLabels(translator(locales[locale], 'SearchPage'))
      expect(Object.keys(labels)).toHaveLength(ADVANCED_FIELDS.length)
      for (const label of Object.values(labels)) expect(label).toBeTruthy()
    }
  })
})
