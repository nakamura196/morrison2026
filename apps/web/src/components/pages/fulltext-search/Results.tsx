'use client'

import { withSearch } from '@elastic/react-search-ui'
import type { SearchResult } from '@elastic/search-ui'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

interface ResultsProps {
  results: SearchResult[]
  searchTerm: string
}

function getRawValue(result: SearchResult, field: string): string {
  const val = result[field]?.raw
  if (val === undefined || val === null) return ''
  return String(val)
}

function ResultItem({ result, searchTerm }: { result: SearchResult; searchTerm: string }) {
  const t = useTranslations('FulltextSearchPage')

  const callNumber = getRawValue(result, 'item_id') // callNumber as item ID
  const page = getRawValue(result, 'page')
  const textSnippet = getRawValue(result, 'text_snippet')
  const itemTitle = getRawValue(result, 'item_title')
  const author = getRawValue(result, 'author')
  const classification = getRawValue(result, 'classification')
  const thumbnailUrl = getRawValue(result, 'thumbnail_url')
  const hasImage = result['has_image']?.raw

  // Build Mirador viewer URL (ID is callNumber)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  const manifestUrl = `${siteUrl}/api/iiif/2/${callNumber}/manifest`
  const canvasUrl = `${siteUrl}/api/iiif/2/${callNumber}/canvas/p${page}`
  const viewerUrl = `/mirador?iiif-content=${encodeURIComponent(manifestUrl)}&canvas=${encodeURIComponent(canvasUrl)}&q=${encodeURIComponent(searchTerm)}`

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="flex-shrink-0 flex justify-center sm:justify-start">
            <img
              src={thumbnailUrl}
              alt={itemTitle}
              className="h-24 sm:h-28 w-auto object-contain rounded border border-gray-200 dark:border-gray-600"
              loading="lazy"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-2">
              {callNumber && (
                <Link
                  href={`/item/${callNumber}`}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  {callNumber}
                </Link>
              )}
              {page && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {t('page')}: {page}
                </span>
              )}
              {classification && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {classification}
                </span>
              )}
            </div>
            {hasImage && (
              <Link
                href={viewerUrl}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('viewInViewer')}
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            )}
          </div>

          {/* Title */}
          {itemTitle && (
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              <Link href={`/item/${callNumber}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                {itemTitle}
              </Link>
              {author && (
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-2">
                  {author}
                </span>
              )}
            </h3>
          )}

          {/* Text Snippet */}
          {textSnippet && (
            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md border-l-4 border-blue-500">
              <p
                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: textSnippet }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CustomResults({ results, searchTerm }: ResultsProps) {
  if (!results || results.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <ResultItem key={index} result={result} searchTerm={searchTerm} />
      ))}
    </div>
  )
}

export default withSearch(({ results, searchTerm }) => ({
  results,
  searchTerm,
}))(CustomResults)
