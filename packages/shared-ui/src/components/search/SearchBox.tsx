'use client';

import Downshift from 'downshift';
import { SearchBox as SearchBoxComponent } from '@elastic/react-search-ui';
import { HiSearch, HiX } from 'react-icons/hi';
import type { SearchUITranslations, ThemeColor } from './types';

const CustomSearchBoxView = ({
  value,
  onChange,
  onSubmit,
  onSelectAutocomplete,
  placeholder,
  ariaLabel,
  showSearchButton = false,
  searchButtonText,
  themeColor = 'amber',
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onSelectAutocomplete: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  showSearchButton?: boolean;
  searchButtonText?: string;
  themeColor?: ThemeColor;
}) => {
  const buttonColor = themeColor === 'amber'
    ? 'bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-700 focus:ring-amber-500'
    : themeColor === 'neutral'
    ? 'bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 focus:ring-neutral-500'
    : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 focus:ring-blue-500';

  const focusColor = themeColor === 'amber'
    ? 'hover:border-amber-500/50 dark:hover:border-amber-400/50 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 focus:border-amber-500 dark:focus:border-amber-400'
    : themeColor === 'neutral'
    ? 'hover:border-neutral-500/50 dark:hover:border-neutral-400/50 focus:ring-neutral-500/20 dark:focus:ring-neutral-400/20 focus:border-neutral-500 dark:focus:border-neutral-400'
    : 'hover:border-blue-500/50 dark:hover:border-blue-400/50 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400';

  const iconHoverColor = themeColor === 'amber'
    ? 'group-hover:text-amber-500 dark:group-hover:text-amber-400'
    : themeColor === 'neutral'
    ? 'group-hover:text-neutral-700 dark:group-hover:text-neutral-300'
    : 'group-hover:text-blue-500 dark:group-hover:text-blue-400';

  return (
    <Downshift
      onChange={(selectedItem) => {
        if (selectedItem) {
          onSelectAutocomplete(selectedItem);
        }
      }}
      onInputValueChange={(newValue: string) => {
        if (value === newValue) return;
        onChange(newValue);
      }}
      itemToString={() => value}
    >
      {() => {
        return (
          <form
            onSubmit={(e) => {
              onSubmit(e);
            }}
            className="w-full"
          >
            <div className="flex gap-2">
              <div className="relative group flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <HiSearch className={`h-5 w-5 text-gray-400 ${iconHoverColor} dark:text-gray-500 transition-colors`} />
                </div>
                <input
                  className={`
                    w-full
                    pl-11
                    pr-10
                    py-3.5
                    text-base
                    text-gray-900
                    dark:text-gray-100
                    placeholder-gray-500
                    dark:placeholder-gray-400
                    bg-white
                    dark:bg-gray-800
                    border
                    border-gray-200
                    dark:border-gray-700
                    rounded-xl
                    shadow-sm
                    ${focusColor}
                    focus:outline-none
                    focus:ring-2
                    transition-all
                    duration-200
                    [&::-webkit-search-cancel-button]:hidden
                    [&::-webkit-search-decoration]:hidden
                  `}
                  type="search"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  aria-label={ariaLabel}
                />
                {value && (
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => onChange('')}
                    aria-label="Clear search"
                  >
                    <HiX className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                  </button>
                )}
              </div>
              {showSearchButton && (
                <button
                  type="submit"
                  className={`
                    px-6
                    py-3.5
                    rounded-xl
                    ${buttonColor}
                    text-white
                    text-base
                    font-medium
                    focus:outline-none
                    focus:ring-2
                    focus:ring-offset-2
                    dark:focus:ring-offset-gray-900
                    transition-all
                    duration-200
                    flex
                    items-center
                    gap-2
                    shadow-sm
                  `}
                >
                  <HiSearch className="w-5 h-5" />
                  {searchButtonText}
                </button>
              )}
            </div>
          </form>
        );
      }}
    </Downshift>
  );
};

const SearchBox = ({
  t,
  themeColor = 'amber',
  showSearchButton = false,
}: {
  t?: SearchUITranslations;
  themeColor?: ThemeColor;
  showSearchButton?: boolean;
} = {}) => {
  const placeholder = t?.placeholder || '検索キーワードを入力';
  const ariaLabel = t?.search || '検索';
  const searchButtonText = t?.search || '検索';

  return (
    <SearchBoxComponent
      view={(props) => (
        <CustomSearchBoxView
          {...props}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          showSearchButton={showSearchButton}
          searchButtonText={searchButtonText}
          themeColor={themeColor}
        />
      )}
    />
  );
};

SearchBox.displayName = 'SearchBox';

export default SearchBox;
