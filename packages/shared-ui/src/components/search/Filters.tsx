'use client'

import { WithSearch } from '@elastic/react-search-ui'
import type { FilterValue, Filter } from '@elastic/search-ui'
import ClearFilters from './ClearFilters'
import { HiXCircle } from 'react-icons/hi'
import type { FacetOption, SearchUITranslations, ThemeColor } from './types'

export default function Filters({
  fields,
  t,
  themeColor = 'amber',
}: {
  fields: FacetOption[]
  t: SearchUITranslations
  themeColor?: ThemeColor
}) {
  const translateValue = (value: FilterValue): string => {
    if (value === 1) return t.yes
    if (value === 0) return t.no
    return String(value)
  }

  const colorClasses = themeColor === 'amber'
    ? {
        badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 focus:ring-amber-500/20 dark:focus:ring-amber-400/20',
        label: 'text-amber-600 dark:text-amber-400',
        icon: 'text-amber-500 dark:text-amber-400',
      }
    : themeColor === 'neutral'
    ? {
        badge: 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 focus:ring-neutral-500/20 dark:focus:ring-neutral-400/20',
        label: 'text-neutral-700 dark:text-neutral-300',
        icon: 'text-neutral-600 dark:text-neutral-400',
      }
    : {
        badge: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:ring-blue-500/20 dark:focus:ring-blue-400/20',
        label: 'text-blue-600 dark:text-blue-400',
        icon: 'text-blue-500 dark:text-blue-400',
      }

  return (
    <WithSearch
      mapContextToProps={({
        filters,
        setFilter,
        removeFilter,
      }) => ({
        filters,
        setFilter,
        removeFilter,
      })}
    >
      {({ filters, setFilter, removeFilter }) => {
        if (!filters || filters.length === 0) {
          return null
        }

        return (
          <div className="flex flex-wrap items-center gap-2 p-4 bg-white/80 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm shadow-sm">
            {filters.map((filter: Filter, index: number) =>
              filter.values?.map((value: FilterValue, valueIndex: number) => (
                <button
                  key={`${index}-${valueIndex}`}
                  className={`
                    group
                    flex
                    items-center
                    gap-1.5
                    px-3
                    py-1.5
                    text-sm
                    font-medium
                    ${colorClasses.badge}
                    border
                    rounded-lg
                    transition-all
                    duration-200
                    focus:outline-none
                    focus:ring-2
                  `}
                  onClick={() => {
                    if (!setFilter || !removeFilter) return
                    const newValues = filter.values.filter(
                      (v: FilterValue) => v !== value,
                    )

                    if (newValues.length === 0) {
                      removeFilter(filter.field)
                    } else {
                      setFilter(filter.field, newValues as FilterValue)
                    }
                  }}
                >
                  <span className={colorClasses.label}>
                    {fields.find((f) => f.field === filter.field)?.label}:
                  </span>
                  <span>{translateValue(value)}</span>
                  <HiXCircle className={`w-4 h-4 ${colorClasses.icon} opacity-75 group-hover:opacity-100 transition-opacity duration-200`} />
                </button>
              )),
            )}

            <div className="ml-auto">
              <ClearFilters t={t} themeColor={themeColor} />
            </div>
          </div>
        )
      }}
    </WithSearch>
  )
}
