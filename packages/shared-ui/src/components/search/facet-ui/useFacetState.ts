import { useState, useMemo, useCallback, useEffect } from 'react';
import type { FacetValue, Filter, SortType, FieldValue } from './types';

interface UseFacetStateProps {
  options: FacetValue[];
  filters: Filter[];
  field: string;
  defaultDisplayCount?: number;
  onSearch: (value: string) => void;
}

export function useFacetState({
  options,
  filters,
  field,
  defaultDisplayCount = 20,
  onSearch,
}: UseFacetStateProps) {
  const [sortType, setSortType] = useState<SortType>('count');
  const [displayCount, setDisplayCount] = useState<number>(defaultDisplayCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<FacetValue[]>([]);

  // Filtered and sorted options
  const filteredAndSortedOptions = useMemo(() => {
    return [...options]
      .filter((option) =>
        String(option.value).toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortType === 'count') {
          return (b.count || 0) - (a.count || 0);
        } else {
          return String(a.value).localeCompare(String(b.value));
        }
      });
  }, [options, searchTerm, sortType]);

  // Update selected options when filters change
  useEffect(() => {
    const filter = filters.find((f) => f.field === field);
    if (filter) {
      const selectedFacetValues = filter.values.map((value) => ({
        value,
        count: 0,
        selected: true,
      }));
      setSelectedOptions(selectedFacetValues);
    }
  }, [filters, field]);

  // Current page options
  const currentPageOptions = useMemo(() => {
    const startIndex = (currentPage - 1) * displayCount;
    return filteredAndSortedOptions.slice(startIndex, startIndex + displayCount);
  }, [filteredAndSortedOptions, currentPage, displayCount]);

  // Total pages
  const totalPages = Math.ceil(filteredAndSortedOptions.length / displayCount);

  // Search handler
  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setCurrentPage(1);
      onSearch(value);
    },
    [onSearch]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    handleSearch('');
  }, [handleSearch]);

  // Display count change handler
  const handleDisplayCountChange = useCallback((newCount: number) => {
    setDisplayCount(newCount);
    setCurrentPage(1);
  }, []);

  // Custom remove handler
  const onCustomRemove = useCallback((value: FieldValue) => {
    setSelectedOptions((prev) => prev.filter((option) => option.value !== value));
  }, []);

  // Custom select handler
  const onCustomSelect = useCallback(
    (value: FieldValue) => {
      const option = options.find((o) => o.value === value);
      if (option) {
        setSelectedOptions((prev) => [...prev, option]);
      }
    },
    [options]
  );

  // Generate page numbers with ellipsis
  const getPageNumbers = useCallback(() => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }, [totalPages, currentPage]);

  return {
    sortType,
    setSortType,
    displayCount,
    currentPage,
    setCurrentPage,
    searchTerm,
    isFocused,
    setIsFocused,
    selectedOptions,
    filteredAndSortedOptions,
    currentPageOptions,
    totalPages,
    handleSearch,
    clearSearch,
    handleDisplayCountChange,
    onCustomRemove,
    onCustomSelect,
    getPageNumbers,
  };
}
