'use client';

import { SearchProvider } from '@elastic/react-search-ui';
import type { APIConnector } from '@elastic/search-ui';

import CustomResultPerPage from './ResultsPerPage';
import PagingInfo from './PagingInfo';
import Facets from './Facets';
import Filters from './Filters';
import Paging from './Paging';
import type { FacetOption, SearchUITranslations, ThemeColor } from './types';

const SearchUI = ({
  facetOptions,
  searchFields,
  resultFields,
  connector,
  children,
  t,
  themeColor = 'amber',
  sortField,
}: {
  facetOptions: FacetOption[];
  searchFields: Record<string, object>;
  resultFields: Record<string, object>;
  connector: APIConnector;
  children: {
    results: React.ReactNode;
    searchForm?: React.ReactNode;
  };
  t: SearchUITranslations;
  themeColor?: ThemeColor;
  sortField?: string;
}) => {
  const facetsConfig: {
    [key: string]: {
      type: string;
      size: number;
      sort: 'count' | 'value';
    };
  } = {};

  for (const facet of facetOptions) {
    facetsConfig[facet.field] = {
      type: facet.type || 'value',
      size: facet.size || 100,
      sort: facet.sortField || 'count',
    };
  }

  const disjunctiveFacets = facetOptions.map((facet) => facet.field);

  const config = {
    alwaysSearchOnInitialLoad: true,
    apiConnector: connector,
    searchQuery: {
      search_fields: searchFields,
      result_fields: resultFields,
      facets: facetsConfig,
      disjunctiveFacets,
    },
    initialState: sortField ? {
      sortDirection: 'asc' as const,
      sortField,
    } : {},
  };

  return (
    <SearchProvider config={config}>
      <div className="space-y-6">
        {/* 検索ボックス */}
        {children.searchForm && (
          <div className="w-full max-w-3xl mx-auto">
            {children.searchForm}
          </div>
        )}

        {/* フィルター */}
        <div className="w-full">
          <Filters fields={facetOptions} t={t} themeColor={themeColor} />
        </div>

        {/* ファセット */}
        <div className="w-full">
          <Facets fields={facetOptions} t={t} themeColor={themeColor} />
        </div>

        {/* 検索結果情報 */}
        <div className="w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm">
            <div className="sui-paging-info">
              <PagingInfo t={t} />
            </div>

            <div className="flex items-center gap-2">
              <CustomResultPerPage t={t} themeColor={themeColor} />
            </div>
          </div>
        </div>

        {/* 検索結果 */}
        <div className="w-full">{children.results}</div>

        {/* ページネーション */}
        <div className="w-full">
          <div className="text-center mt-8">
            <Paging t={t} themeColor={themeColor} />
          </div>
        </div>
      </div>
    </SearchProvider>
  );
};

export default SearchUI;
