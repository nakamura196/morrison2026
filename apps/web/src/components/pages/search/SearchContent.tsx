'use client'

import { ApiProxyConnector } from '@elastic/search-ui-elasticsearch-connector'
import { WithSearch } from '@elastic/react-search-ui'
import type { SearchContextState } from '@elastic/search-ui'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

import { SearchUI, SearchBox } from '@toyo/shared-ui'
import type { FacetOption, SearchUITranslations } from '@toyo/shared-ui'

const indexName = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

const connector = new ApiProxyConnector({
  basePath: `/api/${indexName}`,
})

interface SearchResult {
  title?: { raw: string; snippet?: string }
  description?: { raw: string; snippet?: string }
  abstract?: { raw: string; snippet?: string }
  heading1?: { raw: string; snippet?: string }
  publication?: { raw: string; snippet?: string }
  format?: { raw: string }
  callNumber?: { raw: string }
  tag1?: { raw: string }
  holding?: { raw: string }
  has_image?: { raw: boolean | number }
  publication_year?: { raw: string }
  thumbnail_urls?: { raw: { small?: string; medium?: string; large?: string } }
  omeka_id?: { raw: number }
  id?: { raw: string }
}

function Results() {
  const t = useTranslations('Search')

  return (
    <WithSearch
      mapContextToProps={({ results, isLoading, searchTerm, current, resultsPerPage, filters }: Partial<SearchContextState>) => ({
        results, isLoading, searchTerm, current, resultsPerPage, filters
      })}
    >
      {(props: Partial<SearchContextState>) => {
        const { isLoading, searchTerm, current = 1, resultsPerPage = 20, filters = [] } = props
        const results = (props.results || []) as SearchResult[]
        if (isLoading) {
          return (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )
        }

        if (!results || results.length === 0) {
          return (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">{t('noResults')}</p>
            </div>
          )
        }

        return (
          <div className="space-y-4">
            {results.map((result, index) => {
              const title = result.title?.raw || ''
              const author = result.heading1?.raw
              const description = result.description?.snippet || result.description?.raw
              const callNumber = result.callNumber?.raw
              const tag1 = result.tag1?.raw
              const hasImage = result.has_image?.raw
              const publicationYear = result.publication_year?.raw
              const thumbnailUrl = result.thumbnail_urls?.raw?.small
              const id = result.id?.raw || `item-${index}`

              // Build search params for navigation
              const searchParams = new URLSearchParams()
              if (searchTerm) searchParams.set('q', searchTerm)
              searchParams.set('page', String(current))
              searchParams.set('size', String(resultsPerPage))
              searchParams.set('pos', String(index))
              if (filters && filters.length > 0) {
                searchParams.set('filters', JSON.stringify(filters))
              }
              const queryString = searchParams.toString()

              return (
                <Link
                  key={id}
                  href={`/item/${id}${queryString ? `?${queryString}` : ''}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors overflow-hidden"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    {thumbnailUrl && (
                      <div className="shrink-0 w-24 sm:w-32 bg-gray-100 dark:bg-gray-700">
                        <img
                          src={thumbnailUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex-1 p-4 min-w-0">
                      <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 hover:underline line-clamp-2">
                        {result.title?.snippet ? (
                          <span dangerouslySetInnerHTML={{ __html: result.title.snippet }} />
                        ) : (
                          title || id
                        )}
                      </h3>

                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {author && <span>{author}</span>}
                        {publicationYear && <span>{publicationYear}</span>}
                        {hasImage && (
                          <span className="text-green-500" title={t('hasImage')}>
                            <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </span>
                        )}
                      </div>

                      {description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 search-results">
                          <span dangerouslySetInnerHTML={{ __html: description }} />
                        </p>
                      )}

                      <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-2 flex flex-wrap justify-end gap-x-3">
                        {tag1 && (
                          <span className="text-green-600 dark:text-green-400">{tag1}</span>
                        )}
                        {callNumber && <span>{callNumber}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      }}
    </WithSearch>
  )
}

export default function SearchContent() {
  const tFacet = useTranslations('Facet')
  const tSearch = useTranslations('SearchPage')

  const facetOptions: FacetOption[] = [
    {
      label: tFacet('classification'),
      field: 'tag1',
      type: 'value',
      size: 50,
    },
    {
      label: tFacet('author'),
      field: 'heading1.keyword',
      type: 'value',
      size: 50,
    },
    {
      label: tFacet('publicationYear'),
      field: 'publication_year',
      type: 'value',
      size: 50,
      sortField: 'value',
    },
    {
      label: tFacet('hasImage'),
      field: 'has_image',
      type: 'value',
      size: 10,
    },
  ]

  const searchFields = {
    title: { weight: 3 },
    heading1: { weight: 2 },
    description: {},
    abstract: {},
    publication: {},
    callNumber: {},
  }

  const resultFields = {
    title: {},
    description: {},
    abstract: {},
    heading1: {},
    publication: {},
    format: {},
    callNumber: {},
    callNumber_converted: {},
    tag1: {},
    tag1_numbered: {},
    holding: {},
    has_image: {},
    publication_year: {},
    thumbnail_urls: {},
    omeka_id: {},
  }

  // Create translations object for shared-ui
  const translations: SearchUITranslations = {
    // SearchBox
    placeholder: tSearch('searchPlaceholder'),
    search: tSearch('search'),
    // PagingInfo
    searching: tSearch('searching'),
    quotationStart: tSearch('quotationStart'),
    quotationEnd: tSearch('quotationEnd'),
    noMatchFound: tSearch('noMatchFound'),
    noResultsAvailable: tSearch('noResultsAvailable'),
    showing: tSearch('showing'),
    of: tSearch('of'),
    items: tSearch('items'),
    searchKeyword: tSearch('searchKeyword'),
    maxResultsNote: tSearch('maxResultsNote'),
    // ResultsPerPage
    itemsPerPage: tSearch('itemsPerPage'),
    // Paging
    previous: tSearch('previous'),
    next: tSearch('next'),
    // ClearFilters
    reset: tSearch('reset'),
    // Filters
    yes: tSearch('yes'),
    no: tSearch('no'),
    // FacetHeader
    display: tSearch('display'),
    displaying: tSearch('displaying'),
    sortBy: tSearch('sortBy'),
    byCount: tSearch('byCount'),
    byName: tSearch('byName'),
    searchPlaceholder: tSearch('facetSearchPlaceholder'),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gray-700 dark:bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-center">
            {translations.search || '検索'}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <SearchUI
          facetOptions={facetOptions}
          searchFields={searchFields}
          resultFields={resultFields}
          connector={connector}
          t={translations}
          themeColor="blue"
        >
          {{
            searchForm: <SearchBox t={translations} themeColor="blue" showSearchButton />,
            results: <Results />,
          }}
        </SearchUI>
      </div>
    </div>
  )
}
