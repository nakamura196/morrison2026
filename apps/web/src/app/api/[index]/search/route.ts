type Filter = {
  field: string
  values: (number | string | boolean)[]
}

type QueryConfig = {
  search_fields?: Record<string, object>
  result_fields?: Record<string, { snippet?: object }>
  facets?: Record<string, { size?: number }>
  disjunctiveFacets?: string[]
}

type State = {
  current?: number
  resultsPerPage?: number
  searchTerm?: string
  filters?: Filter[]
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

function createHeaders() {
  const user = process.env.ES_USERNAME || ''
  const password = process.env.ES_PASSWORD || ''
  const auth = Buffer.from(`${user}:${password}`).toString('base64')

  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${auth}`,
  }
}

function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: createCorsHeaders(),
  })
}

// Convert numeric 0/1 to boolean in filters
function convertNumericBooleansInFilters(filters: Filter[]): Filter[] {
  if (!filters) return filters

  return filters.map((filter) => {
    if (filter.values && Array.isArray(filter.values)) {
      return {
        ...filter,
        values: filter.values.map((value: number | string | boolean) =>
          typeof value === 'number' && (value === 0 || value === 1) ? value === 1 : value
        ),
      }
    }
    return filter
  })
}

// Build base query (search term only, no filters)
function buildBaseQuery(searchTerm: string, searchFields: string[]) {
  if (searchTerm && searchTerm.trim()) {
    return {
      multi_match: {
        query: searchTerm,
        fields: searchFields,
        type: 'phrase',
        analyzer: 'standard',
      },
    }
  }
  return { match_all: {} }
}

// Build filter clauses excluding a specific field
function buildFilterClauses(filters: Filter[], excludeField?: string) {
  return filters
    .filter((f) => f.field !== excludeField)
    .map((f) => ({
      terms: { [f.field]: f.values },
    }))
}

// Direct ES query search
async function directSearch(host: string, index: string, state: State, queryConfig: QueryConfig) {
  const { current = 1, resultsPerPage = 20, searchTerm = '', filters = [], sortField, sortDirection } = state
  const from = (current - 1) * resultsPerPage
  const searchFields = Object.keys(queryConfig.search_fields || {})
  const disjunctiveFacets = queryConfig.disjunctiveFacets || []

  // Build ES query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esQuery: any = {
    size: resultsPerPage,
    from,
    track_total_hits: true,
    _source: Object.keys(queryConfig.result_fields || {}),
  }

  // Sort
  if (sortField) {
    esQuery.sort = [{ [sortField]: sortDirection || 'asc' }]
  }

  // Build query with all filters
  const baseQuery = buildBaseQuery(searchTerm, searchFields)

  if (filters.length > 0) {
    const filterClauses = buildFilterClauses(filters)
    esQuery.query = {
      bool: {
        must: baseQuery.match_all ? [] : [baseQuery],
        filter: filterClauses,
      },
    }
  } else {
    esQuery.query = baseQuery
  }

  // Facets/Aggregations with disjunctive support
  const facetFields = Object.keys(queryConfig.facets || {})
  if (facetFields.length > 0) {
    esQuery.aggs = {}

    for (const field of facetFields) {
      const facetConfig = queryConfig.facets?.[field]
      const isDisjunctive = disjunctiveFacets.includes(field)

      if (isDisjunctive && filters.some((f) => f.field === field)) {
        const otherFilters = buildFilterClauses(filters, field)

        if (otherFilters.length > 0 || (searchTerm && searchTerm.trim())) {
          const filterQuery: Record<string, unknown> = {
            bool: {
              must: searchTerm && searchTerm.trim() ? [baseQuery] : [],
              filter: otherFilters,
            },
          }

          esQuery.aggs[field] = {
            filter: filterQuery,
            aggs: {
              inner: {
                terms: {
                  field,
                  size: facetConfig?.size || 100,
                },
              },
            },
          }
        } else {
          esQuery.aggs[field] = {
            global: {},
            aggs: {
              inner: {
                terms: {
                  field,
                  size: facetConfig?.size || 100,
                },
              },
            },
          }
        }
      } else {
        esQuery.aggs[field] = {
          terms: {
            field,
            size: facetConfig?.size || 100,
          },
        }
      }
    }
  }

  // Highlight - Morrison fields
  esQuery.highlight = {
    pre_tags: ['<mark>'],
    post_tags: ['</mark>'],
    fields: {
      title: {},
      description: {},
      abstract: {},
      heading1: {},
      publication: {},
    },
  }

  // Make ES request
  const esResponse = await fetch(`${host}/${index}/_search`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(esQuery),
  })

  const responseText = await esResponse.text()

  let esData
  try {
    esData = JSON.parse(responseText)
  } catch {
    console.error('ES returned non-JSON response:', responseText.substring(0, 500))
    throw new Error(`Elasticsearch returned non-JSON response (status ${esResponse.status}): ${responseText.substring(0, 200)}`)
  }

  if (!esResponse.ok) {
    console.error('ES error:', esData)
    throw new Error(esData.error?.reason || 'Elasticsearch error')
  }

  // Transform to search-ui format
  const totalResults = esData.hits?.total?.value || 0
  const results = (esData.hits?.hits || []).map((hit: {
    _id: string
    _source: Record<string, unknown>
    highlight?: Record<string, string[]>
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {}

    result.id = { raw: hit._id }

    for (const [key, value] of Object.entries(hit._source || {})) {
      result[key] = { raw: value }
    }

    // Add highlights as snippets
    if (hit.highlight) {
      for (const [key, highlights] of Object.entries(hit.highlight)) {
        if (result[key]) {
          result[key].snippet = highlights[0]
        }
      }
    }
    return result
  })

  // Transform facets
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const facets: Record<string, any[]> = {}
  if (esData.aggregations) {
    for (const [field, agg] of Object.entries(esData.aggregations)) {
      const aggData = agg as {
        buckets?: Array<{ key: string; doc_count: number }>
        inner?: { buckets?: Array<{ key: string; doc_count: number }> }
        doc_count?: number
      }

      const buckets = aggData.inner?.buckets || aggData.buckets || []
      const filteredBuckets = buckets.filter((b) => b.key !== '')
      facets[field] = [
        {
          type: 'value',
          data: filteredBuckets.map((b) => ({
            value: b.key,
            count: b.doc_count,
          })),
        },
      ]
    }
  }

  return {
    results,
    totalResults,
    totalPages: Math.ceil(totalResults / resultsPerPage),
    requestId: Date.now().toString(),
    facets,
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ index: string }> },
) {
  const body = await request.json()
  const { index } = await params
  const host = process.env.ES_HOST || ''
  const { state, queryConfig } = body

  // Validate index
  const allowedIndices = (process.env.ALLOWED_INDICES || 'morrison_bib').split(',').map(s => s.trim())
  if (!allowedIndices.includes(index)) {
    return new Response(
      JSON.stringify({ error: 'Index not allowed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...createCorsHeaders() },
      }
    )
  }

  try {
    if (state.filters) {
      state.filters = convertNumericBooleansInFilters(state.filters)
    }

    const response = await directSearch(host, index, state, queryConfig)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...createCorsHeaders(),
      },
    })
  } catch (error) {
    console.error('Search error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch data from Elasticsearch',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...createCorsHeaders(),
        },
      },
    )
  }
}
