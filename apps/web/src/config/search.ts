/**
 * Morrison Pamphlets Search Configuration
 *
 * This file defines the search fields, result fields, and their weights
 * for the Morrison Pamphlets database search functionality.
 */

export interface SearchFieldConfig {
  [key: string]: { weight?: number }
}

export interface ResultFieldConfig {
  [key: string]: object
}

/**
 * Fields to search when user enters a query.
 * Weight determines relevance scoring (higher = more important).
 */
export const searchFields: SearchFieldConfig = {
  title: { weight: 3 },              // タイトル (最重要)
  titleStatement: { weight: 2 },     // タイトル責任表示
  heading1: { weight: 2 },           // 著者
  description: {},                   // 内容
  abstract_en: {},                   // OCR+AI要約（英語）
  abstract_ja: {},                   // OCR+AI要約（日本語）
  publication: {},                   // 出版情報
  publisher: {},                     // 出版社
  callNumber: {},                    // 請求記号
  tag2: {},                          // 細分類2
  tag3: {},                          // 細分類3
}

/**
 * Fields to include in search results.
 * These fields will be returned in the API response.
 */
export const resultFields: ResultFieldConfig = {
  title: {},
  titleStatement: {},
  description: {},
  abstract_en: {},
  abstract_ja: {},
  heading1: {},
  publication: {},
  publisher: {},
  date: {},
  isPartOf: {},
  format: {},
  callNumber: {},
  callNumber_converted: {},
  tag1: {},
  tag1_numbered: {},
  tag2: {},
  tag3: {},
  holding: {},
  references: {},
  has_image: {},
  publication_year: {},
  language: {},
  thumbnail_urls: {},
  omeka_id: {},
}

/**
 * Fields to highlight in search results.
 * Matched text in these fields will be wrapped with <mark> tags.
 */
export const highlightFields: string[] = [
  'title',
  'titleStatement',
  'description',
  'abstract_en',
  'abstract_ja',
  'heading1',
  'publication',
  'publisher',
]
