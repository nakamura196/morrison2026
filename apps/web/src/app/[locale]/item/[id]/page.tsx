import Common from '@/components/layout/Common'
import { config } from '@/config'
import { Metadata } from 'next'
import { cache } from 'react'
import { getDefaultMetadata } from '@/libs/metadata'
import { getTranslations } from 'next-intl/server'
import { createHeaders } from '@/libs/api'
import { Link } from '@/i18n/routing'
import type { MorrisonItem } from '@/types/morrison'
import ItemViewer from '@/components/pages/item/ItemViewer'

const getData = cache(async (id: string): Promise<MorrisonItem | null> => {
  const host = process.env.ES_HOST || ''
  const index = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

  try {
    const response = await fetch(`${host}/${index}/_doc/${id}`, {
      method: 'GET',
      headers: createHeaders(),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (!data.found) {
      return null
    }

    return {
      id: data._id,
      ...data._source,
    }
  } catch (error) {
    console.error('Failed to fetch item:', error)
    return null
  }
})

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> => {
  const { locale, id } = await params
  const item = await getData(id)

  if (!item) {
    return {
      title: 'Not Found',
    }
  }

  const baseMetadata = await getDefaultMetadata(locale)
  const title = item.title || id

  return {
    ...baseMetadata,
    title: `${title} | ${config.siteName}`,
    openGraph: {
      ...baseMetadata.openGraph,
      title: `${title} | ${config.siteName}`,
    },
    twitter: {
      ...baseMetadata.twitter,
      title: `${title} | ${config.siteName}`,
    },
  }
}

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; page?: string; size?: string; pos?: string; filters?: string }>
}) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const tCommon = await getTranslations('Common')
  const t = await getTranslations('ItemPage')

  const item = await getData(id)

  if (!item) {
    return (
      <Common title="Not Found">
        <div className="text-center py-20">
          <p className="text-gray-600 dark:text-gray-400">{t('noData')}</p>
        </div>
      </Common>
    )
  }

  const title = item.title || id

  // Build search URL with params preserved
  const searchUrlParams = new URLSearchParams()
  if (resolvedSearchParams.q) searchUrlParams.set('q', resolvedSearchParams.q)
  if (resolvedSearchParams.page && resolvedSearchParams.page !== '1') {
    searchUrlParams.set('current', `n_${resolvedSearchParams.page}_n`)
  }
  if (resolvedSearchParams.size && resolvedSearchParams.size !== '20') {
    searchUrlParams.set('size', `n_${resolvedSearchParams.size}_n`)
  }
  if (resolvedSearchParams.filters) {
    searchUrlParams.set('filters', resolvedSearchParams.filters)
  }
  const searchHref = `/search${searchUrlParams.toString() ? `?${searchUrlParams.toString()}` : ''}`

  const breadcrumbs = [
    {
      href: searchHref,
      label: tCommon('search'),
    },
  ]

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  // IIIF manifest URL
  const manifestUrl = `${siteUrl}/api/iiif/3/${id}/manifest`
  const hasImages = item.has_image

  return (
    <div>
      <Common title={title} breadcrumbs={breadcrumbs}>
        {/* IIIF Viewer */}
        {hasImages && (
          <ItemViewer
            manifestUrl={manifestUrl}
            searchQuery={resolvedSearchParams.q}
          />
        )}

        {/* Thumbnail fallback (when no IIIF viewer) */}
        {!hasImages && item.thumbnail_urls?.large && (
          <div className="mb-6 flex justify-center">
            <img
              src={item.thumbnail_urls.large}
              alt={title}
              className="max-h-96 rounded-lg shadow-md"
            />
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-blue-800 dark:text-blue-200">
              {t('bibliographicInfo')}
            </h2>
          </div>

          <dl className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Title */}
            {item.title && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('title')}
                </dt>
                <dd className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.title}
                </dd>
              </div>
            )}

            {/* Author */}
            {item.heading1 && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('author')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.heading1}
                </dd>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('description')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.description}
                </dd>
              </div>
            )}

            {/* Abstract */}
            {item.abstract && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('abstract')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.abstract}
                </dd>
              </div>
            )}

            {/* Publication */}
            {item.publication && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('publication')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.publication}
                </dd>
              </div>
            )}

            {/* Publication Year */}
            {item.publication_year && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('publicationYear')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.publication_year}
                </dd>
              </div>
            )}

            {/* Format */}
            {item.format && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('format')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.format}
                </dd>
              </div>
            )}

            {/* Call Number */}
            {item.callNumber && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('callNumber')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.callNumber}
                </dd>
              </div>
            )}

            {/* Classification */}
            {item.tag1 && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('classification')}
                </dt>
                <dd className="mt-1 text-sm text-green-600 dark:text-green-400 sm:col-span-3 sm:mt-0">
                  {item.tag1}
                </dd>
              </div>
            )}

            {/* Holding */}
            {item.holding && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('holding')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.holding}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Links section */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {/* IIIF Manifest link */}
          {hasImages && (
            <a
              href={manifestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <img
                src="https://iiif.io/assets/images/logos/logo-sm.png"
                alt="IIIF"
                className="w-5 h-5 mr-2"
              />
              IIIF Manifest
            </a>
          )}

        </div>

        {/* Back to search */}
        <div className="mt-6 text-center">
          <Link
            href={searchHref}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <svg className="mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('backToSearch')}
          </Link>
        </div>
      </Common>
    </div>
  )
}
