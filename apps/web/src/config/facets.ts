/**
 * 絞り込み (ファセット) の一覧。
 *
 * 画面から切り離してここに置いてある理由は 2 つある。
 *
 *  1. 絞り込み中の表示 (画面上部の札) は、この一覧から見出しを引く。
 *     一覧に無い項目でアドレス (URL) を開くと、`has_fulltext: true` のように
 *     項目名と値が生のまま出る (2026-09-11 に本文ありの絞り込みで発生)。
 *  2. その取りこぼしを試験で捉えられるようにする。可視化ページなどが作る
 *     リンク (libs/search-link.ts) の項目が、すべてここに載っているかを
 *     config/facets.test.ts で確かめている。
 */

import type { FacetOption } from '@toyo/shared-ui'

/** 見出しを引くための翻訳関数 (next-intl の useTranslations と同じ形)。 */
type T = (key: string) => string

/** 検索画面 (書誌) の絞り込み。`tFacet` は messages の `Facet` を見る。 */
export function searchFacetOptions(tFacet: T): FacetOption[] {
  return [
    { label: tFacet('classification'), field: 'tag1', type: 'value', size: 50 },
    { label: tFacet('author'), field: 'heading1.keyword', type: 'value', size: 50 },
    {
      label: tFacet('publicationYear'),
      field: 'publication_year',
      type: 'value',
      size: 50,
      sortField: 'value',
    },
    { label: tFacet('hasImage'), field: 'has_image', type: 'value', size: 10 },
    // 本文 (OCR) あり。可視化ページからのリンクがこの項目で絞り込むので、
    // ここに無いと札の見出しが `has_fulltext` のまま出る。
    { label: tFacet('hasFulltext'), field: 'has_fulltext', type: 'value', size: 10 },
    { label: tFacet('persName'), field: 'ne_persName', type: 'value', size: 50 },
    { label: tFacet('placeName'), field: 'ne_placeName', type: 'value', size: 50 },
    { label: tFacet('orgName'), field: 'ne_orgName', type: 'value', size: 50 },
    { label: tFacet('date'), field: 'ne_date', type: 'value', size: 50 },
  ]
}

/**
 * 全文検索画面の絞り込み。
 * `t` は messages の `FulltextSearchPage`、`tFacet` は `Facet` を見る。
 */
export function fulltextFacetOptions(t: T, tFacet: T): FacetOption[] {
  return [
    { label: t('bookTitle'), field: 'item_title', type: 'value', showSearch: true, size: 500 },
    { label: tFacet('persName'), field: 'ne_persName', type: 'value', showSearch: true, size: 50 },
    { label: tFacet('placeName'), field: 'ne_placeName', type: 'value', showSearch: true, size: 50 },
    { label: tFacet('orgName'), field: 'ne_orgName', type: 'value', size: 50 },
    { label: tFacet('date'), field: 'ne_date', type: 'value', size: 50 },
  ]
}

/**
 * 「項目を指定して絞り込む」欄が扱う項目。ファセットではないので、
 * 札の見出しはこちらから引く (Filters の extraLabels)。
 */
export const ADVANCED_FIELDS = [
  { field: 'title', labelKey: 'advTitle' },
  { field: 'heading1', labelKey: 'advAuthor' },
  { field: 'publication', labelKey: 'advPublication' },
  { field: 'callNumber', labelKey: 'advCallNumber' },
] as const

/**
 * 「項目を指定して絞り込む」欄の項目名 → 表示名。
 *
 * 札の見出しはファセットの一覧から引くので、ファセットでないこの欄の項目は
 * 引けず、以前は `: travel` のように見出しが空欄になっていた。それを補う。
 */
export function advancedFilterLabels(t: T): Record<string, string> {
  return Object.fromEntries(ADVANCED_FIELDS.map(f => [f.field, t(f.labelKey)]))
}
