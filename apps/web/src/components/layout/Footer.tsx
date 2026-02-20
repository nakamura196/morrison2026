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
    quickLinks: locale === 'en' ? 'Quick Links' : 'クイックリンク',
    search: locale === 'en' ? 'Search' : '検索',
    relatedLinks: locale === 'en' ? 'Related Links' : '関連リンク',
    copyright: locale === 'en' ? 'Toyo Bunko' : '東洋文庫',
  }

  return (
    <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Site info */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300">
              {config.siteName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {config.siteDescription}
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">
              {labels.quickLinks}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/search"
                  className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  {labels.search}
                </Link>
              </li>
            </ul>
          </div>

          {/* Related links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-100">
              {labels.relatedLinks}
            </h3>
            <ul className="space-y-2">
              {config.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
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
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <p className="text-sm text-center text-gray-500 dark:text-gray-500">
            &copy; {new Date().getFullYear()}{' '}
            <a
              href="http://www.toyo-bunko.or.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {labels.copyright}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
