'use client'

import { useState } from 'react'
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
import Results, { type ViewMode } from './Results'

function ViewToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (mode: ViewMode) => void }) {
  const t = useTranslations('SearchPage')

  return (
    <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <button
        onClick={() => onChange('list')}
        className={`px-3 py-2.5 text-sm font-medium transition-colors ${
          viewMode === 'list'
            ? 'bg-brand text-white'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title={t('viewList')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        onClick={() => onChange('grid')}
        className={`px-3 py-2.5 text-sm font-medium transition-colors ${
          viewMode === 'grid'
            ? 'bg-brand text-white'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title={t('viewGrid')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      </button>
    </div>
  )
}

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
        <Filters fields={facetOptions} t={t} themeColor="amber" />
      </div>
      <div className="w-full">
        <Facets fields={facetOptions} t={t} themeColor="amber" />
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
  const tFacet = useTranslations('Facet')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const facetOptions: FacetOption[] = [
    {
      label: t('bookTitle'),
      field: 'item_title',
      type: 'value',
      showSearch: true,
      size: 500,
    },
    {
      label: tFacet('persName'),
      field: 'ne_persName',
      type: 'value',
      showSearch: true,
      size: 50,
    },
    {
      label: tFacet('placeName'),
      field: 'ne_placeName',
      type: 'value',
      showSearch: true,
      size: 50,
    },
    {
      label: tFacet('orgName'),
      field: 'ne_orgName',
      type: 'value',
      size: 50,
    },
    {
      label: tFacet('date'),
      field: 'ne_date',
      type: 'value',
      size: 50,
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
        ne_persName: { type: 'value' as const, size: 50 },
        ne_placeName: { type: 'value' as const, size: 50 },
        ne_orgName: { type: 'value' as const, size: 50 },
        ne_date: { type: 'value' as const, size: 50 },
      },
      disjunctiveFacets: ['item_title', 'ne_persName', 'ne_placeName', 'ne_orgName', 'ne_date'],
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
          <SearchBox t={translations} themeColor="amber" showSearchButton />
        </div>

        {/* Filters and Facets */}
        <ConditionalFacets facetOptions={facetOptions} t={translations} />

        {/* Search Results Info */}
        <div className="w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm">
            <div className="sui-paging-info">
              <PagingInfo t={translations} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ResultsPerPage t={translations} themeColor="amber" />
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tSearch('sortByLabel')}
                </label>
                <SortBy options={sortOptions} />
              </div>
              <ViewToggle viewMode={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="w-full">
          <Results viewMode={viewMode} />
        </div>

        {/* Pagination */}
        <div className="w-full">
          <div className="text-center mt-8">
            <Paging t={translations} themeColor="amber" />
          </div>
        </div>
      </div>
    </SearchProvider>
  )
}
