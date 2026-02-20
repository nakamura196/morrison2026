import type {
  APIConnector,
  RequestState,
  QueryConfig,
  ResponseState,
  AutocompleteQueryConfig,
  AutocompleteResponseState,
} from '@elastic/search-ui'

interface FulltextSearchConnectorConfig {
  basePath: string
}

export class FulltextSearchConnector implements APIConnector {
  private basePath: string

  constructor(config: FulltextSearchConnectorConfig) {
    this.basePath = config.basePath
  }

  async onSearch(state: RequestState, queryConfig: QueryConfig): Promise<ResponseState> {
    const response = await fetch(this.basePath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state, queryConfig }),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch search results')
    }

    const data = await response.json()

    return {
      results: data.results || [],
      totalResults: data.totalResults || 0,
      totalPages: data.totalPages || 0,
      requestId: data.requestId || '',
      facets: data.facets || {},
      resultSearchTerm: state.searchTerm || '',
      pagingStart: ((state.current || 1) - 1) * (state.resultsPerPage || 20) + 1,
      pagingEnd: Math.min(
        ((state.current || 1) - 1) * (state.resultsPerPage || 20) + (data.results?.length || 0),
        data.totalResults || 0,
      ),
      wasSearched: true,
      rawResponse: data,
    }
  }

  async onAutocomplete(
    _state: RequestState,
    _queryConfig: AutocompleteQueryConfig,
  ): Promise<AutocompleteResponseState> {
    return {
      autocompletedResults: [],
      autocompletedSuggestions: {},
      autocompletedResultsRequestId: '',
      autocompletedSuggestionsRequestId: '',
    }
  }

  onResultClick(): void {
    // No-op
  }

  onAutocompleteResultClick(): void {
    // No-op
  }
}
