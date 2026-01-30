import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownZA, ArrowUpAZ, ChevronDown, Filter } from 'lucide-react';

export type FilterOperator =
  | 'Equals'
  | 'Does not equal'
  | 'Contains'
  | 'Does not contain'
  | 'Begin with'
  | 'Does not begin with'
  | 'End with'
  | 'Does not end with'
  | 'Contains data'
  | 'Does not contain data';

export type ColumnFilter = { op: FilterOperator; value: string };

type ColumnMenuProps = {
  columnId: string;
  label: string;
  isOpen: boolean;
  onToggle: (columnId: string) => void;
  onClose: () => void;
  onSort: (columnId: string, direction: 'asc' | 'desc') => void;
  onApplyFilter: (columnId: string, filter: ColumnFilter) => void;
  onClearFilter: (columnId: string) => void;
  currentFilter?: ColumnFilter;
};

const filterOptions: FilterOperator[] = [
  'Equals',
  'Does not equal',
  'Contains',
  'Does not contain',
  'Begin with',
  'Does not begin with',
  'End with',
  'Does not end with',
  'Contains data',
  'Does not contain data'
];

export function ColumnMenu({
  columnId,
  label,
  isOpen,
  onToggle,
  onClose,
  onSort,
  onApplyFilter,
  onClearFilter,
  currentFilter
}: ColumnMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'menu' | 'filter'>('menu');
  const [op, setOp] = useState<FilterOperator>('Contains');
  const [value, setValue] = useState('');

  const needsValue = useMemo(() => !['Contains data', 'Does not contain data'].includes(op), [op]);

  useEffect(() => {
    if (!isOpen) return;
    setMode('menu');
    setOp(currentFilter?.op ?? 'Contains');
    setValue(currentFilter?.value ?? '');
  }, [currentFilter, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose]);

  const handleApply = () => {
    onApplyFilter(columnId, { op, value: needsValue ? value : '' });
    onClose();
  };

  const handleClear = () => {
    onClearFilter(columnId);
    onClose();
  };

  return (
    <div className="column-menu" ref={containerRef}>
      <button className="column-menu__trigger" type="button" onClick={() => onToggle(columnId)}>
        <span>{label}</span>
        <ChevronDown size={14} />
      </button>
      {isOpen && (
        <div className="column-menu__dropdown">
          {mode === 'menu' ? (
            <div className="column-menu__list">
              <button type="button" className="column-menu__item" onClick={() => onSort(columnId, 'asc')}>
                <ArrowUpAZ size={14} />
                A to Z
              </button>
              <button type="button" className="column-menu__item" onClick={() => onSort(columnId, 'desc')}>
                <ArrowDownZA size={14} />
                Z to A
              </button>
              <button type="button" className="column-menu__item" onClick={() => setMode('filter')}>
                <Filter size={14} />
                Filter By
              </button>
            </div>
          ) : (
            <div className="column-menu__filter">
              <label>
                Filter
                <select value={op} onChange={(event) => setOp(event.target.value as FilterOperator)}>
                  {filterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Value
                <input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  disabled={!needsValue}
                  placeholder={needsValue ? 'Enter value' : 'N/A'}
                />
              </label>
              <div className="column-menu__actions">
                <button type="button" onClick={handleApply}>
                  Apply
                </button>
                <button type="button" className="secondary" onClick={handleClear}>
                  Clear filter
                </button>
                <button type="button" className="secondary" onClick={() => setMode('menu')}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
