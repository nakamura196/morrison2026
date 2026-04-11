'use client'

import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { HiCalendar, HiChevronRight } from 'react-icons/hi'

export interface NewsTranslations {
  loading: string
  noNews: string
  errorLoading: string
}

export type ThemeColor = 'amber' | 'blue' | 'neutral'

interface LinkProps {
  href: string
  children: ReactNode
  className?: string
}

interface NewsItem {
  id: string
  attributes: {
    title: string
    field_date?: string
  }
}

interface NewsResponse {
  data: NewsItem[]
}

interface NewsProps {
  apiUrl: string
  locale: string
  limit?: number
  t: NewsTranslations
  themeColor?: ThemeColor
  LinkComponent: ComponentType<LinkProps>
}

export default function News({
  apiUrl,
  locale,
  limit,
  t,
  themeColor = 'amber',
  LinkComponent,
}: NewsProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hoverColor = themeColor === 'amber'
    ? 'group-hover:text-amber-600 dark:group-hover:text-amber-400'
    : themeColor === 'neutral'
    ? 'group-hover:text-neutral-900 dark:group-hover:text-white'
    : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'

  const iconHoverColor = themeColor === 'amber'
    ? 'group-hover:text-amber-500 dark:group-hover:text-amber-400'
    : themeColor === 'neutral'
    ? 'group-hover:text-neutral-700 dark:group-hover:text-neutral-300'
    : 'group-hover:text-blue-500 dark:group-hover:text-blue-400'

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const localePrefix = locale === 'en' ? '/en' : ''
        const res = await fetch(`${apiUrl}${localePrefix}/jsonapi/node/u_news?sort=-field_date`)

        if (!res.ok) {
          throw new Error('Failed to fetch news')
        }

        const data: NewsResponse = await res.json()
        const displayNews = limit ? data.data.slice(0, limit) : data.data
        setNews(displayNews)
      } catch {
        setError(t.errorLoading)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [apiUrl, locale, limit, t.errorLoading])

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        {t.loading}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500 dark:text-red-400">
        {error}
      </div>
    )
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        {t.noNews}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {news.map((item) => (
        <LinkComponent key={item.id} href={`/news/${item.id}`} className="block group">
          <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-start space-x-4">
              <div className="flex items-center text-gray-500 dark:text-gray-400 shrink-0">
                <HiCalendar className="w-5 h-5 mr-2" />
                <time dateTime={item.attributes.field_date}>
                  {item.attributes.field_date?.split('T')[0]}
                </time>
              </div>
              <h3 className={`text-gray-900 dark:text-gray-100 ${hoverColor} transition-colors`}>
                {item.attributes.title}
              </h3>
            </div>
            <HiChevronRight className={`w-5 h-5 text-gray-400 dark:text-gray-500 ${iconHoverColor} transition-colors shrink-0`} />
          </div>
        </LinkComponent>
      ))}
    </div>
  )
}
