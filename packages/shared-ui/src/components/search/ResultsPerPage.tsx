'use client';

import { ResultsPerPage as ResultsPerPageComponent } from '@elastic/react-search-ui';
import { createContext, useContext } from 'react';
import type { SearchUITranslations, ThemeColor } from './types';

interface ResultsPerPageContext {
  t: SearchUITranslations;
  themeColor: ThemeColor;
}

const ResultsPerPageContext = createContext<ResultsPerPageContext>({
  t: {} as SearchUITranslations,
  themeColor: 'amber',
});

const CustomView = ({
  onChange,
  options = [10, 20, 50, 100, 500],
  value = 10,
}: {
  onChange: (value: number) => void;
  options?: number[];
  value?: number;
}) => {
  const { t, themeColor } = useContext(ResultsPerPageContext);

  const focusColor = themeColor === 'amber'
    ? 'focus:ring-amber-500/20 dark:focus:ring-amber-400/20 focus:border-amber-500 dark:focus:border-amber-400'
    : 'focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400';

  return (
    <div className="relative">
      <select
        className={`
        appearance-none
        pl-4
        pr-10
        py-2.5
        rounded-lg
        border
        border-gray-200
        dark:border-gray-700
        bg-white
        dark:bg-gray-800
        text-gray-700
        dark:text-gray-300
        hover:border-gray-300
        dark:hover:border-gray-600
        focus:outline-none
        focus:ring-2
        ${focusColor}
        cursor-pointer
        transition-all
        duration-200
        text-sm
        font-medium
        shadow-sm
      `}
        onChange={(e) => onChange(Number(e.target.value))}
        value={value}
      >
        {options.map((item) => (
          <option key={item} value={item} className="py-2 bg-white dark:bg-gray-800">
            {`${item} ${t.itemsPerPage || '件表示'}`}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

const ResultsPerPage = ({
  t,
  themeColor = 'amber',
}: {
  t: SearchUITranslations;
  themeColor?: ThemeColor;
}) => {
  const options = [10, 20, 50, 100, 500];
  return (
    <ResultsPerPageContext.Provider value={{ t, themeColor }}>
      <ResultsPerPageComponent options={options} view={CustomView} />
    </ResultsPerPageContext.Provider>
  );
};

ResultsPerPage.displayName = 'ResultsPerPage';

export default ResultsPerPage;
