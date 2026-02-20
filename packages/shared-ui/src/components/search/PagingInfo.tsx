'use client';

import { withSearch } from '@elastic/react-search-ui';
import { createContext, useContext } from 'react';
import type { SearchUITranslations } from './types';

// Elasticsearch default max result window
const MAX_RESULTS = 10000;

// Context for passing translation strings
const PagingInfoTranslationsContext = createContext<Partial<SearchUITranslations>>({});

const CustomPagingInfoView = ({
  start,
  end,
  totalResults,
  searchTerm,
  isLoading,
  wasSearched,
}: {
  start: number;
  end: number;
  totalResults: number;
  searchTerm: string;
  isLoading: boolean;
  wasSearched: boolean;
}) => {
  const t = useContext(PagingInfoTranslationsContext);

  const loadingText = t.searching || '読み込み中...';
  const noResultsForText = t.noMatchFound || 'に一致する結果が見つかりませんでした。';
  const noResultsText = t.noResultsAvailable || '結果が見つかりませんでした。';
  const showingText = t.showing || '表示中';
  const ofText = t.of || '件中';
  const searchKeywordText = t.searchKeyword || '検索キーワード：';
  const maxResultsNoteText = t.maxResultsNote || `（最大${MAX_RESULTS.toLocaleString()}件まで表示可能）`;
  const exceedsMaxResults = totalResults > MAX_RESULTS;

  if (isLoading) {
    return <div className="text-gray-700 dark:text-gray-300">{loadingText}</div>;
  }

  // 検索語が未入力で、まだ検索が実行されていない場合
  if (!searchTerm && !wasSearched) {
    return null;
  }

  if (totalResults === 0) {
    return searchTerm ? (
      <div className="text-gray-700 dark:text-gray-300">
        <strong>{t.quotationStart || '「'}{searchTerm}{t.quotationEnd || '」'}</strong>{noResultsForText}
      </div>
    ) : (
      <div className="text-gray-700 dark:text-gray-300">{noResultsText}</div>
    );
  }

  return (
    <div className="text-gray-700 dark:text-gray-300">
      {showingText} <strong>{start.toLocaleString()}</strong> - <strong>{end.toLocaleString()}</strong>{' '}
      {ofText} <strong>{totalResults.toLocaleString()}</strong>
      {exceedsMaxResults && (
        <span className="ml-1 text-amber-600 dark:text-amber-400 text-sm">
          {maxResultsNoteText}
        </span>
      )}
      {searchTerm && (
        <span className="ml-2">
          （{searchKeywordText}<strong>{t.quotationStart || '「'}{searchTerm}{t.quotationEnd || '」'}</strong>）
        </span>
      )}
    </div>
  );
};

const EnhancedPagingInfo = withSearch(({ pagingStart, pagingEnd, totalResults, isLoading, searchTerm, wasSearched }) => ({
  start: pagingStart,
  end: pagingEnd,
  totalResults,
  isLoading,
  searchTerm,
  wasSearched,
}))(CustomPagingInfoView);

export default function PagingInfo({
  t,
}: {
  t: SearchUITranslations;
}) {
  return (
    <PagingInfoTranslationsContext.Provider value={t}>
      <EnhancedPagingInfo />
    </PagingInfoTranslationsContext.Provider>
  );
}
