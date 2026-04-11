'use client';

import { useTranslations } from 'next-intl';

interface FacetPaginationProps {
  currentPage: number;
  totalPages: number;
  pageNumbers: (number | string)[];
  onPageChange: (page: number) => void;
}

export function FacetPagination({
  currentPage,
  totalPages,
  pageNumbers,
  onPageChange,
}: FacetPaginationProps) {
  const t = useTranslations('Facet');

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1.5 rounded-lg text-sm border border-gray-200
          dark:border-gray-600 bg-white dark:bg-gray-800
          text-gray-700 dark:text-gray-300 disabled:opacity-50
          disabled:cursor-not-allowed hover:bg-gray-50
          dark:hover:bg-gray-700 transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400"
      >
        {t('previous')}
      </button>

      <div className="hidden sm:flex items-center gap-1">
        {pageNumbers.map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...' || page === currentPage}
            className={`
              w-8 h-8 rounded-lg text-sm flex items-center justify-center
              transition-all duration-200
              ${
                page === currentPage
                  ? 'bg-neutral-900 text-white dark:bg-neutral-700'
                  : page === '...'
                  ? 'text-gray-400 dark:text-gray-500 cursor-default'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
              ${page !== '...' ? 'hover:shadow-sm dark:hover:shadow-gray-900/30' : ''}
              focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400
            `}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 rounded-lg text-sm border border-gray-200
          dark:border-gray-600 bg-white dark:bg-gray-800
          text-gray-700 dark:text-gray-300 disabled:opacity-50
          disabled:cursor-not-allowed hover:bg-gray-50
          dark:hover:bg-gray-700 transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400"
      >
        {t('next')}
      </button>
    </div>
  );
}
