'use client';

import { HiSearch, HiX } from 'react-icons/hi';
import type { SortType } from './types';

interface FacetHeaderTranslations {
  itemsOf?: string;
  showing?: string;
  searchPlaceholder?: string;
  display?: string;
  items10?: string;
  items20?: string;
  items50?: string;
  items100?: string;
  sortBy?: string;
  sortByCount?: string;
  sortByName?: string;
  search?: string;
}

interface FacetHeaderProps {
  label: string;
  isDisplayCountLimited: boolean;
  filteredCount: number;
  currentPageStart: number;
  currentPageEnd: number;
  searchTerm: string;
  isFocused: boolean;
  sortType: SortType;
  displayCount: number;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onFocusChange: (focused: boolean) => void;
  onSortTypeChange: (type: SortType) => void;
  onDisplayCountChange: (count: number) => void;
  onSearch: () => void;
  onClose?: () => void;
  showSearchButton?: boolean;
  t?: FacetHeaderTranslations;
}

export function FacetHeader({
  label,
  isDisplayCountLimited,
  filteredCount,
  currentPageStart,
  currentPageEnd,
  searchTerm,
  isFocused,
  sortType,
  displayCount,
  onSearchChange,
  onClearSearch,
  onFocusChange,
  onSortTypeChange,
  onDisplayCountChange,
  onSearch,
  onClose,
  showSearchButton = true,
  t = {},
}: FacetHeaderProps) {
  const translations = {
    itemsOf: t.itemsOf || '件中',
    showing: t.showing || '表示',
    searchPlaceholder: t.searchPlaceholder || '検索...',
    display: t.display || '表示',
    items10: t.items10 || '10件',
    items20: t.items20 || '20件',
    items50: t.items50 || '50件',
    items100: t.items100 || '100件',
    sortBy: t.sortBy || '並び替え',
    sortByCount: t.sortByCount || '件数順',
    sortByName: t.sortByName || '名前順',
    search: t.search || '検索',
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 text-sm">
      {/* Label and count */}
      <div className="flex items-center gap-2 min-w-[200px] shrink-0">
        <span className="font-medium text-gray-800 dark:text-gray-100">{label}</span>
        {isDisplayCountLimited && (
          <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
            ({filteredCount}
            {translations.itemsOf}
            {currentPageEnd > 0 ? ` ${currentPageStart}-${currentPageEnd}` : '0'}
            {translations.showing})
          </span>
        )}
      </div>

      {/* Search form */}
      {isDisplayCountLimited && (
        <div className="flex-1 min-w-[200px]">
          <div
            className={`
              relative flex items-center overflow-hidden rounded-lg w-full
              border ${
                isFocused
                  ? 'border-blue-500 ring-1 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20'
                  : 'border-gray-200 dark:border-gray-600'
              }
              transition-all duration-200
            `}
          >
            <HiSearch className="absolute left-3 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => onFocusChange(true)}
              onBlur={() => onFocusChange(false)}
              placeholder={translations.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100 text-sm
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={onClearSearch}
                className="absolute right-3 text-gray-400 hover:text-gray-600
                  dark:text-gray-500 dark:hover:text-gray-300
                  transition-colors duration-200"
              >
                <HiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-row justify-between lg:justify-end items-center gap-3 shrink-0 ml-auto">
        {/* Display count select */}
        {isDisplayCountLimited && (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-gray-500 dark:text-gray-400 hidden sm:inline text-sm">
              {translations.display}
            </span>
            <select
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm min-w-[80px]
                focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                focus:border-transparent transition-all duration-200"
              value={displayCount}
              onChange={(e) => onDisplayCountChange(Number(e.target.value))}
            >
              <option value={10}>{translations.items10}</option>
              <option value={20}>{translations.items20}</option>
              <option value={50}>{translations.items50}</option>
              <option value={100}>{translations.items100}</option>
            </select>
          </div>
        )}

        {/* Sort select */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-gray-500 dark:text-gray-400 hidden sm:inline text-sm">
            {translations.sortBy}
          </span>
          <select
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600
              bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm min-w-[90px]
              focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
              focus:border-transparent transition-all duration-200"
            value={sortType}
            onChange={(e) => onSortTypeChange(e.target.value as SortType)}
          >
            <option value="count">{translations.sortByCount}</option>
            <option value="value">{translations.sortByName}</option>
          </select>
        </div>

        {/* Search button */}
        {showSearchButton && (
          <button
            onClick={onSearch}
            className="px-4 py-2 rounded-lg border border-blue-500 dark:border-blue-400
              bg-blue-500 dark:bg-blue-600 text-white text-sm min-w-[90px]
              hover:bg-blue-600 dark:hover:bg-blue-700
              focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
              focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-all duration-200
              flex items-center justify-center gap-2 shadow-sm"
          >
            <HiSearch className="w-4 h-4" />
            {translations.search}
          </button>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
        >
          <HiX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
