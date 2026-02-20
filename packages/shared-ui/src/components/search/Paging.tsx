'use client';

import { Paging } from '@elastic/react-search-ui';
import type { SearchUITranslations, ThemeColor } from './types';

// Elasticsearch default max result window
const MAX_RESULTS = 10000;

export default function CustomPaging({
  t,
  themeColor = 'amber',
}: {
  t: SearchUITranslations;
  themeColor?: ThemeColor;
}) {
  const activeColor = themeColor === 'amber'
    ? 'bg-amber-600 text-white'
    : 'bg-blue-600 text-white';

  return (
    <Paging
      view={({ current = 1, totalPages, resultsPerPage = 20, onChange }) => {
        // Limit totalPages based on Elasticsearch's max result window
        const maxPages = Math.floor(MAX_RESULTS / resultsPerPage);
        const effectiveTotalPages = Math.min(totalPages, maxPages);
        const pageNumbers: (number | string)[] = [];
        const maxVisiblePages = 3;

        if (effectiveTotalPages <= maxVisiblePages) {
          pageNumbers.push(...Array.from({ length: effectiveTotalPages }, (_, i) => i + 1));
        } else {
          const startPage = Math.max(1, current - 1);
          const endPage = Math.min(effectiveTotalPages, current + 1);

          if (startPage > 1) pageNumbers.push(1, '...');
          pageNumbers.push(
            ...Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
          );
          if (endPage < effectiveTotalPages) pageNumbers.push('...', effectiveTotalPages);
        }

        return (
          <nav className="flex justify-center" aria-label={t.previous && t.next ? 'Pagination' : undefined}>
            <ul className="flex space-x-2">
              {pageNumbers.map((page, index) => (
                <li key={index}>
                  {typeof page === 'number' ? (
                    <button
                      onClick={() => onChange(page)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                      ${
                        current === page
                          ? activeColor
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span className="px-4 py-2 text-sm font-medium text-gray-500">{page}</span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        );
      }}
    />
  );
}
