'use client';

import { WithSearch } from '@elastic/react-search-ui';

interface NoResultsProps {
  noResultsText?: string;
}

const NoResults = ({ noResultsText = 'に一致する結果が見つかりませんでした。' }: NoResultsProps) => {
  return (
    <WithSearch
      mapContextToProps={({ searchTerm }) => ({
        searchTerm,
      })}
    >
      {({ searchTerm }) => (
        searchTerm ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              「{searchTerm}」{noResultsText}
            </p>
          </div>
        ) : null
      )}
    </WithSearch>
  );
};

NoResults.displayName = 'NoResults';

export default NoResults;
