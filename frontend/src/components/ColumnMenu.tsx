import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Filter } from 'lucide-react';

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

export type DateFilterOperator = 'On' | 'On or after' | 'On or before';
export type DateFilterPreset = 'Today' | 'Yesterday' | 'This week' | 'This month' | 'This year';
export type DateColumnFilter = { kind: 'date'; op: DateFilterOperator; preset: DateFilterPreset; date?: string };
export type TextColumnFilter = { kind: 'text'; op: FilterOperator; value: string };
export type ColumnFilter = TextColumnFilter | DateColumnFilter;

type ColumnMenuProps = {
  columnId: string;
  label: string;
  isDate?: boolean;
  isOpen: boolean;
  onToggle: (columnId: string) => void;
  onClose: () => void;
  onSort: (columnId: string, direction: 'asc' | 'desc') => void;
  onApplyFilter: (columnId: string, filter: ColumnFilter) => void;
  onClearFilter: (columnId: string) => void;
  currentFilter?: ColumnFilter;
  renderTrigger?: (props: { label: string; onToggle: () => void; isOpen: boolean }) => ReactNode;
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
const dateFilterOperators: DateFilterOperator[] = ['On', 'On or after', 'On or before'];
const dateFilterPresets: DateFilterPreset[] = ['Today', 'Yesterday', 'This week', 'This month', 'This year'];

export function ColumnMenu({
  columnId,
  label,
  isDate,
  isOpen,
  onToggle,
  onClose,
  onSort,
  onApplyFilter,
  onClearFilter,
  currentFilter,
  renderTrigger
}: ColumnMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'menu' | 'filter'>('menu');
  const [op, setOp] = useState<FilterOperator>('Contains');
  const [value, setValue] = useState('');
  const [dateOp, setDateOp] = useState<DateFilterOperator>('On');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('Today');
  const [dateValue, setDateValue] = useState('');

  const needsValue = useMemo(() => !['Contains data', 'Does not contain data'].includes(op), [op]);

  useEffect(() => {
    if (!isOpen) return;
    setMode('menu');
    if (isDate && currentFilter?.kind === 'date') {
      setDateOp(currentFilter.op);
      setDatePreset(currentFilter.preset);
      setDateValue(currentFilter.date ?? '');
    } else {
      setDateOp('On');
      setDatePreset('Today');
      setDateValue('');
    }
    if (!isDate && currentFilter?.kind === 'text') {
      setOp(currentFilter.op);
      setValue(currentFilter.value);
    } else {
      setOp('Contains');
      setValue('');
    }
  }, [currentFilter, isDate, isOpen]);

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
    if (isDate) {
      onApplyFilter(columnId, {
        kind: 'date',
        op: dateOp,
        preset: datePreset,
        date: dateValue || undefined
      });
    } else {
      onApplyFilter(columnId, { kind: 'text', op, value: needsValue ? value : '' });
    }
    onClose();
  };

  const handleClear = () => {
    onClearFilter(columnId);
    onClose();
  };

  return (
    <div className="column-menu" ref={containerRef}>
      {renderTrigger ? (
        renderTrigger({ label, onToggle: () => onToggle(columnId), isOpen })
      ) : (
        <button className="column-menu__trigger" type="button" onClick={() => onToggle(columnId)}>
          <span>{label}</span>
          <ChevronDown size={14} />
        </button>
      )}
      {isOpen && (
        <div className="column-menu__dropdown">
          {mode === 'menu' ? (
            <div className="column-menu__list">
              {isDate ? (
                <>
                  <button type="button" className="column-menu__item" onClick={() => onSort(columnId, 'asc')}>
                    <ArrowUp size={18} />
                    Older to newer
                  </button>
                  <button type="button" className="column-menu__item" onClick={() => onSort(columnId, 'desc')}>
                    <ArrowDown size={18} />
                    Newer to older
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="column-menu__item" onClick={() => onSort(columnId, 'asc')}>
                    <ArrowUp size={18} />
                    A to Z
                  </button>
                  <button type="button" className="column-menu__item" onClick={() => onSort(columnId, 'desc')}>
                    <ArrowDown size={18} />
                    Z to A
                  </button>
                </>
              )}
              <button type="button" className="column-menu__item" onClick={() => setMode('filter')}>
                <Filter size={18} />
                Filter By
              </button>
            </div>
          ) : (
            <div className="column-menu__filter">
              {isDate ? (
                <>
                  <label>
                    Filter
                    <select value={dateOp} onChange={(event) => setDateOp(event.target.value as DateFilterOperator)}>
                      {dateFilterOperators.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Value
                    <select
                      value={datePreset}
                      onChange={(event) => setDatePreset(event.target.value as DateFilterPreset)}
                    >
                      {dateFilterPresets.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
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
                </>
              )}
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
