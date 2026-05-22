import { pages, news as newsRaw } from '@/content/generated'

export function getContent(slug: string, locale: string): string {
  return pages[`${slug}.${locale}`] ?? pages[`${slug}.ja`] ?? ''
}

export interface NewsItem {
  slug: string
  date: string
  title: string
  body: string
}

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: content }

  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/)
    if (m) meta[m[1]] = m[2]
  }
  return { meta, body: match[2].trim() }
}

function toNewsItem(slug: string, raw: string, locale: string): NewsItem {
  const { meta, body } = parseFrontmatter(raw)
  const titleKey = locale === 'en' ? 'title_en' : 'title'
  return {
    slug,
    date: meta.date || slug.slice(0, 10),
    title: meta[titleKey] || meta.title || slug,
    body,
  }
}

export function getNewsItems(locale: string): NewsItem[] {
  // newest first
  return [...newsRaw]
    .sort((a, b) => (a.slug < b.slug ? 1 : -1))
    .map(({ slug, raw }) => toNewsItem(slug, raw, locale))
}

export function getNewsItem(slug: string, locale: string): NewsItem | null {
  const found = newsRaw.find((n) => n.slug === slug)
  return found ? toNewsItem(found.slug, found.raw, locale) : null
}
