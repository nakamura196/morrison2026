'use client';

import { useState } from 'react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import type { FacetOption, SearchUITranslations, ThemeColor } from './types';
import { WithSearch } from '@elastic/react-search-ui';
import type { Facet as FacetType } from '@elastic/search-ui';
import Facet from './Facet';

interface Facets {
  [key: string]: FacetType[];
}

const Facets = ({
  fields,
  t,
  themeColor = 'amber',
}: {
  fields: FacetOption[];
  t: SearchUITranslations;
  themeColor?: ThemeColor;
}) => {
  const [activeFacets, setActiveFacets] = useState<boolean[]>(Array(fields.length).fill(false));

  const toggleFacet = (index: number) => {
    setActiveFacets((prev) => prev.map((active, i) => (i === index ? !active : active)));
  };

  const buttonActiveColor = themeColor === 'amber'
    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800'
    : themeColor === 'neutral'
    ? 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 ring-1 ring-neutral-300 dark:ring-neutral-700'
    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800';

  const chevronActiveColor = themeColor === 'amber'
    ? 'text-amber-500 dark:text-amber-400'
    : themeColor === 'neutral'
    ? 'text-neutral-700 dark:text-neutral-300'
    : 'text-blue-500 dark:text-blue-400';

  const focusColor = themeColor === 'amber'
    ? 'focus:ring-amber-500 dark:focus:ring-amber-400'
    : themeColor === 'neutral'
    ? 'focus:ring-neutral-500 dark:focus:ring-neutral-400'
    : 'focus:ring-blue-500 dark:focus:ring-blue-400';

  return (
    <>
      <WithSearch
        mapContextToProps={({
          facets,
          filters,
          setFilter,
          removeFilter,
        }) => ({ facets, filters, setFilter, removeFilter })}
      >
        {({
          facets,
        }) => (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm">
              {fields.map((obj, index) => (
                <button
                  key={index}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg transition-all duration-200
                    focus:outline-none focus:ring-2 ${focusColor}
                    focus:ring-offset-2 dark:focus:ring-offset-gray-900 text-sm font-medium
                    flex items-center gap-2 shadow-sm
                    ${
                      activeFacets[index]
                        ? buttonActiveColor
                        : 'bg-white dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/80 hover:shadow'
                    }`}
                  onClick={() => toggleFacet(index)}
                >
                  {obj.label}
                  {obj.type === 'value' && (
                    <span className="bg-white/50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-medium">
                      {(facets as Facets)?.[obj.field]?.[0]?.data.length.toLocaleString() || 0}
                    </span>
                  )}
                  {activeFacets[index] ? (
                    <HiChevronUp className={`w-4 h-4 ${chevronActiveColor}`} />
                  ) : (
                    <HiChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              ))}
            </div>

            {fields.map((obj, index) => (
              <div
                key={index}
                className={`${
                  activeFacets[index] ? '' : 'hidden'
                } bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80
                rounded-xl shadow-sm dark:shadow-gray-900/30 backdrop-blur-sm
                transition-all duration-200 ease-in-out`}
              >
                <Facet
                  field={obj.field}
                  label={obj.label}
                  showSearch={obj.showSearch}
                  translationKey={obj.translationKey}
                  onClose={() => {
                    setActiveFacets((prev) =>
                      prev.map((active, i) => (i === index ? false : active))
                    );
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </WithSearch>
    </>
  );
};

Facets.displayName = 'Facets';

export default Facets;
