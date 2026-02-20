export interface FacetOption {
  label: string
  field: string
  type?: 'value' | 'range'
  size?: number
  sortField?: 'count' | 'value'
  showSearch?: boolean
  translationKey?: string
}

export interface SearchUITranslations {
  // SearchBox
  placeholder: string
  search: string
  // PagingInfo
  searching: string
  quotationStart: string
  quotationEnd: string
  noMatchFound: string
  noResultsAvailable: string
  showing: string
  of: string
  items: string
  searchKeyword: string
  maxResultsNote?: string
  // ResultsPerPage
  itemsPerPage: string
  // Paging
  previous: string
  next: string
  // ClearFilters
  reset: string
  // Filters
  yes: string
  no: string
  // FacetHeader
  display: string
  displaying: string
  sortBy: string
  byCount: string
  byName: string
  searchPlaceholder: string
}

export type ThemeColor = 'amber' | 'blue'
