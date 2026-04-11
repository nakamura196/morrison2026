import Common from '@/components/layout/Common'
import { config } from '@/config'
import { getConfig } from '@/libs/getConfig'
import { Metadata } from 'next'
import { cache } from 'react'
import { getDefaultMetadata } from '@/libs/metadata'
import { getLocale, getTranslations } from 'next-intl/server'
import { createHeaders } from '@/libs/api'
import { Link } from '@/i18n/routing'
import type { MorrisonItem } from '@/types/morrison'
import ItemViewer from '@/components/pages/item/ItemViewer'
import ItemShareExport from '@/components/pages/item/ItemShareExport'

const getData = cache(async (id: string): Promise<{ item: MorrisonItem | null; raw: Record<string, unknown> | null }> => {
  const host = process.env.ES_HOST || ''
  const index = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

  try {
    const response = await fetch(`${host}/${index}/_doc/${id}`, {
      method: 'GET',
      headers: createHeaders(),
    })

    if (!response.ok) {
      return { item: null, raw: null }
    }

    const data = await response.json()
    if (!data.found) {
      return { item: null, raw: null }
    }

    return {
      item: {
        id: data._id,
        ...data._source,
      },
      raw: data._source,
    }
  } catch (error) {
    console.error('Failed to fetch item:', error)
    return { item: null, raw: null }
  }
})

const getIndexLastUpdated = cache(async (): Promise<number | null> => {
  const host = process.env.ES_HOST || ''
  const index = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

  try {
    const response = await fetch(`${host}/${index}/_settings`, {
      method: 'GET',
      headers: createHeaders(),
    })
    if (!response.ok) return null
    const data = await response.json()
    const raw = data?.[index]?.settings?.index?.creation_date
    if (!raw) return null
    return Number(raw)
  } catch {
    return null
  }
})

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> => {
  const { locale, id } = await params
  const { item } = await getData(id)

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
  const locale = await getLocale()
  const tCommon = await getTranslations('Common')
  const t = await getTranslations('ItemPage')

  const [{ item, raw }, lastUpdatedMs, localeConfig] = await Promise.all([
    getData(id),
    getIndexLastUpdated(),
    getConfig(locale),
  ])

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

  const pageUrl = `${siteUrl}/${locale}/item/${id}`
  const dateFormatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const today = dateFormatter.format(new Date())
  const lastUpdatedText = lastUpdatedMs ? dateFormatter.format(new Date(lastUpdatedMs)) : null

  const citationParts = [
    item.heading1,
    item.title ? `"${item.title}"` : null,
    item.publication,
    item.publisher,
    item.callNumber ? `${t('callNumber')}: ${item.callNumber}` : null,
    localeConfig.siteName,
    `${pageUrl} (${t('accessed')} ${today})`,
  ].filter(Boolean)
  const citation = citationParts.join('. ') + '.'

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

        <ItemShareExport
          itemId={id}
          title={title}
          pageUrl={pageUrl}
          manifestUrl={manifestUrl}
          hasImages={!!hasImages}
          itemJson={raw ?? {}}
          citation={citation}
          labels={{
            heading: t('shareExportHeading'),
            exportGroup: t('exportGroup'),
            shareGroup: t('shareGroup'),
            citationGroup: t('citationGroup'),
            jsonExport: t('jsonExport'),
            iiifManifest: t('iiifManifest'),
            copyLink: t('copyLink'),
            copyCitation: t('copyCitation'),
            copied: t('copied'),
            shareOnX: t('shareOnX'),
            shareOnFacebook: t('shareOnFacebook'),
            shareOnLine: t('shareOnLine'),
          }}
        />

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
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

            {/* Title Statement */}
            {item.titleStatement && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('titleStatement')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.titleStatement}
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

            {/* Abstract (English) */}
            {item.abstract_en && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('abstractEn')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.abstract_en}
                </dd>
              </div>
            )}

            {/* Abstract (Japanese) */}
            {item.abstract_ja && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('abstractJa')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.abstract_ja}
                </dd>
              </div>
            )}

            {/* Language */}
            {item.language && item.language.length > 0 && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('language')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.language.map(lang => lang.toUpperCase()).join(', ')}
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

            {/* Publisher */}
            {item.publisher && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('publisher')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.publisher}
                </dd>
              </div>
            )}

            {/* Date */}
            {item.date && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('date')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.date}
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

            {/* Sub-Classification */}
            {(item.tag2 || item.tag3) && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('subClassification')}
                </dt>
                <dd className="mt-1 text-sm text-green-600 dark:text-green-400 sm:col-span-3 sm:mt-0">
                  {[item.tag2, item.tag3].filter(Boolean).join(' > ')}
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

            {/* Is Part Of */}
            {item.isPartOf && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('isPartOf')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.isPartOf.startsWith('http') ? (
                    <a
                      href={item.isPartOf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:text-black dark:text-gray-200 dark:hover:text-white underline"
                    >
                      {item.isPartOf}
                    </a>
                  ) : (
                    item.isPartOf
                  )}
                </dd>
              </div>
            )}

            {/* References */}
            {item.references && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('references')}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-3 sm:mt-0">
                  {item.references.startsWith('http') ? (
                    <a
                      href={item.references}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:text-black dark:text-gray-200 dark:hover:text-white underline"
                    >
                      {item.references}
                    </a>
                  ) : (
                    item.references
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Last updated */}
        {lastUpdatedText && (
          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {t('lastUpdated')}: {lastUpdatedText}
          </div>
        )}

        {/* Back to search */}
        <div className="mt-6 text-center">
          <Link
            href={searchHref}
            className="inline-flex items-center text-sm text-gray-900 hover:text-black dark:text-gray-200 dark:hover:text-white"
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
