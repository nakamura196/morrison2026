'use client'

import { WithSearch } from '@elastic/react-search-ui'
import type { Filter } from '@elastic/search-ui'
import type { SearchUITranslations, ThemeColor } from './types'

function ClearFiltersView({
  filters = [],
  clearFilters,
  t,
  themeColor = 'amber',
}: {
  filters?: Filter[]
  clearFilters?: (except?: string[]) => void
  t: SearchUITranslations
  themeColor?: ThemeColor
}) {
  const colorClasses = themeColor === 'amber'
    ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40'
    : 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40'

  if (!clearFilters || filters.length === 0) {
    return null
  }

  return (
    <button
      className={`px-4 py-2 text-sm ${colorClasses} rounded-full transition-colors whitespace-nowrap`}
      onClick={() => clearFilters()}
    >
      {t.reset}
    </button>
  )
}

export default function ClearFilters({
  t,
  themeColor = 'amber',
}: {
  t: SearchUITranslations
  themeColor?: ThemeColor
}) {
  return (
    <WithSearch
      mapContextToProps={({ filters, clearFilters }) => ({
        filters,
        clearFilters,
      })}
    >
      {({ filters, clearFilters }) => (
        <ClearFiltersView
          filters={filters}
          clearFilters={clearFilters}
          t={t}
          themeColor={themeColor}
        />
      )}
    </WithSearch>
  )
}
