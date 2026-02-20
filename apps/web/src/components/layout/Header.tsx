'use client'

import { useState } from 'react'
import configJa from '@/config.json'
import configEn from '@/config.en.json'
import ThemeToggle from '../../theme/theme-toggle'
import { HiSearch, HiMenu, HiX, HiExternalLink, HiDocumentText, HiInformationCircle, HiBell } from 'react-icons/hi'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { ToggleLanguage } from './toggle-language'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const t = useTranslations('Header')
  const locale = useLocale()
  const config = locale === 'en' ? configEn : configJa

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-blue-700 dark:bg-blue-800 border-b border-blue-800 dark:border-blue-900">
      <nav className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <span className="text-xl sm:text-2xl font-bold text-white">
              {config.siteName}
            </span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/search"
              className="flex items-center space-x-1 text-white hover:text-blue-100 transition-colors"
            >
              <HiSearch className="w-5 h-5" />
              <span>{t('search')}</span>
            </Link>
            <Link
              href="/fulltext-search"
              className="flex items-center space-x-1 text-white hover:text-blue-100 transition-colors"
            >
              <HiDocumentText className="w-5 h-5" />
              <span>{t('fulltextSearch')}</span>
            </Link>
            <Link
              href="/about"
              className="flex items-center space-x-1 text-white hover:text-blue-100 transition-colors"
            >
              <HiInformationCircle className="w-5 h-5" />
              <span>{t('about')}</span>
            </Link>
            <Link
              href="/news"
              className="flex items-center space-x-1 text-white hover:text-blue-100 transition-colors"
            >
              <HiBell className="w-5 h-5" />
              <span>{t('news')}</span>
            </Link>
            {config.links?.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-white hover:text-blue-100 transition-colors"
              >
                <span>{locale === 'en' ? link.title_en : link.title}</span>
                <HiExternalLink className="w-4 h-4" />
              </a>
            ))}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <ToggleLanguage />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center space-x-4 md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-white hover:bg-blue-800 transition-colors"
            >
              <span className="sr-only">{t('openMenu')}</span>
              {isMenuOpen ? (
                <HiX className="w-6 h-6" />
              ) : (
                <HiMenu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`${
            isMenuOpen ? 'block' : 'hidden'
          } md:hidden mt-4 rounded-lg bg-white dark:bg-gray-700 shadow-lg`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/search"
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20"
              onClick={() => setIsMenuOpen(false)}
            >
              <HiSearch className="w-5 h-5" />
              <span>{t('search')}</span>
            </Link>
            <Link
              href="/fulltext-search"
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20"
              onClick={() => setIsMenuOpen(false)}
            >
              <HiDocumentText className="w-5 h-5" />
              <span>{t('fulltextSearch')}</span>
            </Link>
            <Link
              href="/about"
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20"
              onClick={() => setIsMenuOpen(false)}
            >
              <HiInformationCircle className="w-5 h-5" />
              <span>{t('about')}</span>
            </Link>
            <Link
              href="/news"
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20"
              onClick={() => setIsMenuOpen(false)}
            >
              <HiBell className="w-5 h-5" />
              <span>{t('news')}</span>
            </Link>
            {config.links?.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-blue-900/20"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{locale === 'en' ? link.title_en : link.title}</span>
                <HiExternalLink className="w-4 h-4" />
              </a>
            ))}
            <div className="flex items-center justify-end space-x-2 px-3 py-2">
              <ThemeToggle variant="mobile" />
              <ToggleLanguage variant="mobile" />
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
