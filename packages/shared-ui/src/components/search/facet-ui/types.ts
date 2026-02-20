import type { FieldValue, FacetValue, Filter } from '@elastic/search-ui';

export type SortType = 'count' | 'value';

export interface CustomViewProps {
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

export type { FieldValue, FacetValue, Filter };
