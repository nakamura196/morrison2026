'use client'

import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { HiExternalLink } from 'react-icons/hi'
import configJa from '@/config.json'
import configEn from '@/config.en.json'

export default function Footer() {
  const locale = useLocale()
  const config = locale === 'en' ? configEn : configJa

  const labels = {
    about: locale === 'en' ? 'About' : 'このデータベースについて',
    aboutLink: locale === 'en' ? 'About This Database' : 'このデータベースについて',
    news: locale === 'en' ? 'News' : 'お知らせ',
    search: locale === 'en' ? 'Search' : '検索',
    searchLink: locale === 'en' ? 'Search' : '検索',
    fulltextSearch: locale === 'en' ? 'Fulltext Search' : '全文検索',
    relatedLinks: locale === 'en' ? 'Related Links' : '関連リンク',
    copyright: locale === 'en' ? 'Toyo Bunko' : '東洋文庫',
  }

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 border-t border-gray-800 dark:border-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Column 1: About & News */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
              {config.siteName}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {labels.aboutLink}
                </Link>
              </li>
              <li>
                <Link
                  href="/news"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {labels.news}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Search */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
              {labels.search}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/search"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {labels.searchLink}
                </Link>
              </li>
              <li>
                <Link
                  href="/fulltext-search"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {labels.fulltextSearch}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Related links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-200">
              {labels.relatedLinks}
            </h3>
            <ul className="space-y-2">
              {config.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {locale === 'en' ? link.title_en : link.title}
                    <HiExternalLink className="ml-1 w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 pt-6">
          <p className="text-sm text-center text-gray-500">
            &copy; {new Date().getFullYear()}{' '}
            <a
              href="http://www.toyo-bunko.or.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400"
            >
              {labels.copyright}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
