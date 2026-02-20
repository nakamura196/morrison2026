'use client';

import { Facet } from '@elastic/react-search-ui';
import type { FieldValue, FacetValue } from '@elastic/search-ui';
import { WithSearch } from '@elastic/react-search-ui';
import type { Filter, SearchContextState } from '@elastic/search-ui';
import {
  useFacetState,
  FacetHeader,
  FacetOptionList,
  FacetPagination,
} from './facet-ui';

const mode: string = 'normal';

interface CustomViewProps {
  label: string;
  onRemove: (value: FieldValue) => void;
  onSelect: (value: FieldValue) => void;
  options: FacetValue[];
  onSearch: (value: string) => void;
  onClose?: () => void;
  setFilter: (
    field: string,
    value: FieldValue[],
    operator: 'all' | 'any',
    negate: boolean
  ) => void;
  removeFilter: (field: string) => void;
  isFilterable: boolean;
  filters: Filter[];
  field: string;
  translationKey?: string;
}

const CustomView = ({
  label,
  onRemove,
  onSelect,
  options,
  onSearch,
  onClose,
  setFilter,
  removeFilter,
  isFilterable,
  filters,
  field,
  translationKey,
}: CustomViewProps) => {
  const {
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
  } = useFacetState({
    options,
    filters,
    field,
    onSearch,
  });

  const search = () => {
    const values = selectedOptions.map((option) => option.value as FieldValue);
    if (values.length > 0) {
      setFilter(field, values, 'all', false);
    } else {
      removeFilter(field);
    }
  };

  const isDisplayCountLimited = isFilterable;

  return (
    <div className="relative">
      <div className="space-y-4 p-4">
        <FacetHeader
          label={label}
          isDisplayCountLimited={isDisplayCountLimited}
          filteredCount={filteredAndSortedOptions.length}
          currentPageStart={
            currentPageOptions.length > 0 ? (currentPage - 1) * displayCount + 1 : 0
          }
          currentPageEnd={Math.min(
            currentPage * displayCount,
            filteredAndSortedOptions.length
          )}
          searchTerm={searchTerm}
          isFocused={isFocused}
          sortType={sortType}
          displayCount={displayCount}
          onSearchChange={handleSearch}
          onClearSearch={clearSearch}
          onFocusChange={setIsFocused}
          onSortTypeChange={setSortType}
          onDisplayCountChange={handleDisplayCountChange}
          onSearch={search}
          onClose={onClose}
          showSearchButton={mode !== 'quick'}
        />

        <FacetOptionList
          options={currentPageOptions}
          selectedOptions={selectedOptions}
          translationKey={translationKey}
          mode={mode as 'quick' | 'normal'}
          onRemove={onRemove}
          onSelect={onSelect}
          onCustomRemove={onCustomRemove}
          onCustomSelect={onCustomSelect}
        />

        <FacetPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageNumbers={getPageNumbers()}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default function Facet3({
  field,
  label,
  showSearch,
  onClose,
  translationKey,
}: {
  field: string;
  label: string;
  showSearch?: boolean;
  onClose?: () => void;
  translationKey?: string;
}) {
  const CustomViewWithClose = (props: {
    label: string;
    onRemove: (value: FieldValue) => void;
    onSelect: (value: FieldValue) => void;
    options: FacetValue[];
    onSearch: (value: string) => void;
    onClose?: () => void;
    setFilter: (
      field: string,
      value: FieldValue[],
      operator: 'all' | 'any',
      negate: boolean
    ) => void;
    removeFilter: (field: string) => void;
    filters: Filter[];
  }) => (
    <CustomView
      {...props}
      field={field}
      isFilterable={showSearch || false}
      onClose={props.onClose}
      setFilter={props.setFilter}
      removeFilter={props.removeFilter}
      translationKey={translationKey}
    />
  );

  return (
    <WithSearch
      mapContextToProps={({
        setFilter,
        filters,
        removeFilter,
      }) => ({
        setFilter,
        removeFilter,
        filters,
      })}
    >
      {({
        setFilter,
        removeFilter,
        filters,
      }) => {
        if (!setFilter || !removeFilter || !filters) {
          return null;
        }
        return (
          <Facet
            field={field}
            label={label}
            view={(props) => (
              <CustomViewWithClose
                {...props}
                onClose={onClose}
                setFilter={setFilter as (field: string, value: FieldValue[], operator: 'all' | 'any', negate: boolean) => void}
                removeFilter={removeFilter}
                filters={filters}
              />
            )}
            show={5000}
            isFilterable={showSearch}
          />
        );
      }}
    </WithSearch>
  );
}
