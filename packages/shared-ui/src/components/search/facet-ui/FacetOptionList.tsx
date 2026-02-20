'use client';

import type { FacetValue, FieldValue } from './types';

interface FacetOptionListTranslations {
  available?: string;
  notAvailable?: string;
}

interface FacetOptionListProps {
  options: FacetValue[];
  selectedOptions: FacetValue[];
  translationKey?: string;
  mode?: 'quick' | 'normal';
  onRemove: (value: FieldValue) => void;
  onSelect: (value: FieldValue) => void;
  onCustomRemove: (value: FieldValue) => void;
  onCustomSelect: (value: FieldValue) => void;
  t?: FacetOptionListTranslations;
}

export function FacetOptionList({
  options,
  selectedOptions,
  mode = 'normal',
  onRemove,
  onSelect,
  onCustomRemove,
  onCustomSelect,
  t = {},
}: FacetOptionListProps) {
  const translations = {
    available: t.available || 'あり',
    notAvailable: t.notAvailable || 'なし',
  };

  const translateValue = (value: FacetValue['value']): string => {
    if (value === 1) return translations.available;
    if (value === 0) return translations.notAvailable;
    return String(value);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
      {options.map((option) => {
        const checked = selectedOptions.some(
          (selectedOption) => selectedOption.value === option.value
        );
        const value = option.value as FieldValue;

        return (
          <label
            key={String(option.value)}
            className="inline-flex items-center gap-2 cursor-pointer p-2
              rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50
              border border-gray-200 dark:border-gray-700
              text-sm transition-all duration-200
              hover:shadow-sm dark:hover:shadow-gray-900/30"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                checked
                  ? mode === 'quick'
                    ? onRemove(value)
                    : onCustomRemove(value)
                  : mode === 'quick'
                  ? onSelect(value)
                  : onCustomSelect(value)
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600
                text-blue-500 dark:text-blue-400 focus:ring-blue-500
                dark:focus:ring-blue-400 dark:ring-offset-gray-800
                bg-white dark:bg-gray-700
                transition-all duration-200"
              value={String(option.value)}
            />
            <span
              className="text-gray-700 dark:text-gray-200 flex-1 truncate"
              title={translateValue(option.value)}
            >
              {translateValue(option.value)}
            </span>
            <span
              className="text-xs bg-gray-100 dark:bg-gray-700/80
                text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full shrink-0
                font-medium"
            >
              {option.count?.toLocaleString()}
            </span>
          </label>
        );
      })}
    </div>
  );
}
