/**
 * 対応言語の定義。
 *
 * ここには Next や next-intl を持ち込まない。ルーティング（routing.ts）だけでなく、
 * URL の組み立て（libs/canonical-url.ts）のような素の処理からも読むため。
 * 両者が別々に既定言語を持つと、片方だけずれて `/ja/…` のような URL が混ざる。
 */

export const locales = ['ja', 'en'] as const
export type Locale = (typeof locales)[number]

/** 既定の言語。この言語だけ URL に接頭辞が付かない（localePrefix: 'as-needed'）。 */
export const defaultLocale: Locale = 'ja'
