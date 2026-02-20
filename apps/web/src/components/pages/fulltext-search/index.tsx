'use client'

import { SearchProvider, withSearch } from '@elastic/react-search-ui'
import { useTranslations } from 'next-intl'
import { FulltextSearchConnector } from '@/libs/fulltext-search-connector'
import {
  SearchBox,
  PagingInfo,
  ResultsPerPage,
  Paging,
  Facets,
  Filters,
  SortBy,
} from '@toyo/shared-ui'
import type { FacetOption, SearchUITranslations } from '@toyo/shared-ui'
import Results from './Results'

// Conditionally show Facets only after search
const ConditionalFacetsView = ({
  wasSearched,
  searchTerm,
  facetOptions,
  t,
}: {
  wasSearched: boolean
  searchTerm?: string
  facetOptions: FacetOption[]
  t: SearchUITranslations
}) => {
  if (!searchTerm && !wasSearched) {
    return null
  }

  return (
    <>
      <div className="w-full">
        <Filters fields={facetOptions} t={t} themeColor="blue" />
      </div>
      <div className="w-full">
        <Facets fields={facetOptions} t={t} themeColor="blue" />
      </div>
    </>
  )
}

const ConditionalFacets = withSearch<
  { facetOptions: FacetOption[]; t: SearchUITranslations },
  { wasSearched: boolean; searchTerm?: string }
>(({ wasSearched, searchTerm }) => ({
  wasSearched,
  searchTerm,
}))(ConditionalFacetsView)

const connector = new FulltextSearchConnector({
  basePath: '/api/fulltext-search',
})

export default function FulltextSearch() {
  const t = useTranslations('FulltextSearchPage')
  const tSearch = useTranslations('SearchPage')

  const facetOptions: FacetOption[] = [
    {
      label: t('bookTitle'),
      field: 'item_title',
      type: 'value',
      showSearch: true,
      size: 500,
    },
  ]

  const sortOptions = [
    { name: t('sortRelevance'), value: '_score', direction: 'desc' },
    { name: t('sortAppearance'), value: 'appearance', direction: 'asc' },
  ]

  const translations: SearchUITranslations = {
    placeholder: t('searchPlaceholder'),
    search: tSearch('search'),
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
    itemsPerPage: tSearch('itemsPerPage'),
    previous: tSearch('previous'),
    next: tSearch('next'),
    reset: tSearch('reset'),
    yes: tSearch('yes'),
    no: tSearch('no'),
    display: tSearch('display'),
    displaying: tSearch('displaying'),
    sortBy: tSearch('sortBy'),
    byCount: tSearch('byCount'),
    byName: tSearch('byName'),
    searchPlaceholder: tSearch('facetSearchPlaceholder'),
  }

  const config = {
    alwaysSearchOnInitialLoad: true,
    apiConnector: connector,
    searchQuery: {
      search_fields: {},
      result_fields: {},
      facets: {
        item_title: {
          type: 'value' as const,
          size: 500,
        },
      },
      disjunctiveFacets: ['item_title'],
    },
    initialState: {
      resultsPerPage: 20,
      sortField: 'appearance',
      sortDirection: 'asc' as const,
    },
  }

  return (
    <SearchProvider config={config}>
      <div className="space-y-6">
        {/* Description */}
        <div className="mb-4 text-gray-600 dark:text-gray-400">
          <p>{t('description')}</p>
        </div>

        {/* Search Box */}
        <div className="w-full max-w-3xl mx-auto">
          <SearchBox t={translations} themeColor="blue" showSearchButton />
        </div>

        {/* Filters and Facets */}
        <ConditionalFacets facetOptions={facetOptions} t={translations} />

        {/* Search Results Info */}
        <div className="w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm">
            <div className="sui-paging-info">
              <PagingInfo t={translations} />
            </div>
            <div className="flex items-center gap-2">
              <ResultsPerPage t={translations} themeColor="blue" />
              <SortBy options={sortOptions} />
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="w-full">
          <Results />
        </div>

        {/* Pagination */}
        <div className="w-full">
          <div className="text-center mt-8">
            <Paging t={translations} themeColor="blue" />
          </div>
        </div>
      </div>
    </SearchProvider>
  )
}
