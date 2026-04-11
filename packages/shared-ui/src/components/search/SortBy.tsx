'use client';

import { Sorting } from '@elastic/react-search-ui';

const CustomView = ({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) => {
  const selectedValue = value;

  return (
    <div className="relative">
      <select
        className="
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
        focus:ring-neutral-500/20
        dark:focus:ring-neutral-400/20
        focus:border-neutral-500
        dark:focus:border-neutral-400
        cursor-pointer
        transition-all
        duration-200
        text-sm
        font-medium
        shadow-sm
      "
        value={selectedValue}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
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

const SortBy = ({
  options,
}: {
  options: {
    name: string;
    value: string;
    direction: string;
  }[];
}) => {
  return <Sorting label={'Sort by'} sortOptions={options} view={CustomView} />;
};

SortBy.displayName = 'SortBy';

export default SortBy;
