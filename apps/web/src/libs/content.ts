import fs from 'fs'
import path from 'path'

export function getContent(slug: string, locale: string): string {
  const filePath = path.join(process.cwd(), 'src/content', `${slug}.${locale}.md`)
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    // Fallback to Japanese
    const fallbackPath = path.join(process.cwd(), 'src/content', `${slug}.ja.md`)
    return fs.readFileSync(fallbackPath, 'utf-8')
  }
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

export function getNewsItems(locale: string): NewsItem[] {
  const newsDir = path.join(process.cwd(), 'src/content/news')
  if (!fs.existsSync(newsDir)) return []

  const files = fs.readdirSync(newsDir).filter(f => f.endsWith('.md')).sort().reverse()

  return files.map(file => {
    const raw = fs.readFileSync(path.join(newsDir, file), 'utf-8')
    const { meta, body } = parseFrontmatter(raw)
    const slug = file.replace(/\.md$/, '')
    const titleKey = locale === 'en' ? 'title_en' : 'title'

    return {
      slug,
      date: meta.date || slug.slice(0, 10),
      title: meta[titleKey] || meta.title || slug,
      body,
    }
  })
}

export function getNewsItem(slug: string, locale: string): NewsItem | null {
  const newsDir = path.join(process.cwd(), 'src/content/news')
  const filePath = path.join(newsDir, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { meta, body } = parseFrontmatter(raw)
  const titleKey = locale === 'en' ? 'title_en' : 'title'

  return {
    slug,
    date: meta.date || slug.slice(0, 10),
    title: meta[titleKey] || meta.title || slug,
    body,
  }
}
