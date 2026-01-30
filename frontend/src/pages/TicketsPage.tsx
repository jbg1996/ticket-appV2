import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, FileText, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../components/AuthProvider';
import { ColumnMenu } from '../components/ColumnMenu';
import type { ColumnFilter, DateFilterPreset } from '../components/ColumnMenu';

type Ticket = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: { id: string; name: string };
  priority: { id: string; name: string };
  ticketType: { id: string; name: string; description: string; defaultPriorityId: string };
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
};

type SortState = { columnId: string; direction: 'asc' | 'desc' };

type ColumnDefinition = {
  id: string;
  label: string;
  accessor: (ticket: Ticket) => string | number | null | undefined;
  isDate?: boolean;
};

const formatDate = (value: string) => new Date(value).toLocaleString();

export function TicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const [sorting, setSorting] = useState<SortState | null>(null);
  const [openColumnId, setOpenColumnId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const loadTickets = () => {
    apiFetch<Ticket[]>('/api/tickets')
      .then(setTickets)
      .catch(() => setTickets([]));
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    setSelectedIds((prev) => new Set([...prev].filter((id) => tickets.some((ticket) => ticket.id === id))));
  }, [tickets]);

  const columnDefinitions: ColumnDefinition[] = useMemo(
    () => [
      { id: 'title', label: 'Title', accessor: (ticket) => ticket.title },
      { id: 'status', label: 'Status', accessor: (ticket) => ticket.status?.name },
      { id: 'priority', label: 'Priority', accessor: (ticket) => ticket.priority?.name },
      { id: 'type', label: 'Type', accessor: (ticket) => ticket.ticketType?.name },
      { id: 'createdAt', label: 'Created At', accessor: (ticket) => ticket.createdAt, isDate: true },
      { id: 'updatedAt', label: 'Updated At', accessor: (ticket) => ticket.updatedAt, isDate: true },
      {
        id: 'createdBy',
        label: 'Created By',
        accessor: (ticket) => (ticket.createdBy ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : '')
      },
      {
        id: 'assignedTo',
        label: 'Assigned To',
        accessor: (ticket) => (ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : '')
      }
    ],
    []
  );

  const columnMap = useMemo(
    () => columnDefinitions.reduce((acc, column) => ({ ...acc, [column.id]: column }), {} as Record<string, ColumnDefinition>),
    [columnDefinitions]
  );

  const globalSearchFields = useMemo(
    () => [
      (ticket: Ticket) => ticket.title,
      (ticket: Ticket) => ticket.ticketType?.description ?? '',
      (ticket: Ticket) => ticket.status?.name ?? '',
      (ticket: Ticket) => ticket.priority?.name ?? '',
      (ticket: Ticket) => ticket.ticketType?.name ?? '',
      (ticket: Ticket) => (ticket.createdBy ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : ''),
      (ticket: Ticket) => (ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : '')
    ],
    []
  );

  const normalizeValue = (value: string | number | null | undefined) => (value ?? '').toString().toLowerCase();

  const matchesTextFilter = (value: string | number | null | undefined, filter: Extract<ColumnFilter, { kind: 'text' }>) => {
    const normalized = normalizeValue(value);
    const filterValue = filter.value.toLowerCase();
    switch (filter.op) {
      case 'Equals':
        return normalized === filterValue;
      case 'Does not equal':
        return normalized !== filterValue;
      case 'Contains':
        return normalized.includes(filterValue);
      case 'Does not contain':
        return !normalized.includes(filterValue);
      case 'Begin with':
        return normalized.startsWith(filterValue);
      case 'Does not begin with':
        return !normalized.startsWith(filterValue);
      case 'End with':
        return normalized.endsWith(filterValue);
      case 'Does not end with':
        return !normalized.endsWith(filterValue);
      case 'Contains data':
        return normalized.trim().length > 0;
      case 'Does not contain data':
        return normalized.trim().length === 0;
      default:
        return true;
    }
  };

  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const endOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

  const getPresetRange = (preset: DateFilterPreset) => {
    const now = new Date();
    switch (preset) {
      case 'Today': {
        const start = startOfDay(now);
        const end = endOfDay(now);
        return { start, end, endOfRange: end };
      }
      case 'Yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const start = startOfDay(yesterday);
        const end = endOfDay(yesterday);
        return { start, end, endOfRange: end };
      }
      case 'This week': {
        const day = now.getDay();
        const diff = (day + 6) % 7;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - diff);
        const start = startOfDay(weekStart);
        const weekEnd = new Date(start);
        weekEnd.setDate(start.getDate() + 6);
        const endOfRange = endOfDay(weekEnd);
        return { start, end: now, endOfRange };
      }
      case 'This month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const endOfRange = endOfDay(monthEnd);
        return { start, end: now, endOfRange };
      }
      case 'This year': {
        const start = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        const endOfRange = endOfDay(yearEnd);
        return { start, end: now, endOfRange };
      }
      default: {
        const start = startOfDay(now);
        const end = endOfDay(now);
        return { start, end, endOfRange: end };
      }
    }
  };

  const matchesDateFilter = (value: string | number | null | undefined, filter: Extract<ColumnFilter, { kind: 'date' }>) => {
    if (!value) return false;
    const timestamp = Date.parse(value.toString());
    if (Number.isNaN(timestamp)) return false;
    const date = new Date(timestamp);
    const { start, end, endOfRange } = getPresetRange(filter.preset);
    switch (filter.op) {
      case 'On':
        return date >= start && date <= end;
      case 'On or after':
        return date >= start;
      case 'On or before':
        return date <= endOfRange;
      default:
        return true;
    }
  };

  const getSortableValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) return timestamp;
    return value.toString().toLowerCase();
  };

  const applyAll = (data: Ticket[]) => {
    let result = [...data];
    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter((ticket) =>
        globalSearchFields.some((field) => normalizeValue(field(ticket)).includes(query))
      );
    }
    Object.entries(columnFilters).forEach(([columnId, filter]) => {
      const column = columnMap[columnId];
      if (!column) return;
      if (filter.kind === 'date') {
        result = result.filter((ticket) => matchesDateFilter(column.accessor(ticket), filter));
      } else {
        result = result.filter((ticket) => matchesTextFilter(column.accessor(ticket), filter));
      }
    });
    if (sorting) {
      const column = columnMap[sorting.columnId];
      if (column) {
        result.sort((a, b) => {
          const valueA = getSortableValue(column.accessor(a));
          const valueB = getSortableValue(column.accessor(b));
          if (valueA < valueB) return sorting.direction === 'asc' ? -1 : 1;
          if (valueA > valueB) return sorting.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }
    return result;
  };

  const displayTickets = useMemo(() => applyAll(tickets), [tickets, globalSearch, columnFilters, sorting]);
  const visibleIds = useMemo(() => displayTickets.map((ticket) => ticket.id), [displayTickets]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!selectAllRef.current) return;
    const hasSelection = selectedIds.size > 0;
    selectAllRef.current.indeterminate = hasSelection && !allVisibleSelected;
  }, [selectedIds, allVisibleSelected]);

  const handleToggleColumn = (columnId: string) => {
    setOpenColumnId((prev) => (prev === columnId ? null : columnId));
  };

  const handleApplyFilter = (columnId: string, filter: ColumnFilter) => {
    setColumnFilters((prev) => ({ ...prev, [columnId]: filter }));
  };

  const handleClearFilter = (columnId: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  };

  const handleSort = (columnId: string, direction: 'asc' | 'desc') => {
    setSorting({ columnId, direction });
    setOpenColumnId(null);
  };

  const renderColumnTrigger = (columnId: string, label: string) => {
    const isChevronColumn = ['title', 'status', 'priority', 'type'].includes(columnId);
    if (!isChevronColumn) return undefined;
    return ({ onToggle, label: triggerLabel }: { onToggle: () => void; label: string; isOpen: boolean }) => (
      <button type="button" className="thButton" onClick={onToggle}>
        <span>{triggerLabel}</span>
        <ChevronDown size={14} className="thChevron" />
      </button>
    );
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    if (!isAdmin || selectedIds.size === 0) return;
    if (!confirm('Delete the selected tickets?')) return;
    setActionLoading(true);
    setFeedback('');
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          apiFetch(`/api/tickets/${id}`, {
            method: 'DELETE'
          })
        )
      );
      setSelectedIds(new Set());
      setFeedback('Tickets deleted.');
      loadTickets();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'No se pudieron eliminar los tickets.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = async () => {
    setActionLoading(true);
    setFeedback('');
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          source: 'tickets',
          search: globalSearch,
          sorting,
          filters: columnFilters
        })
      });
      setFeedback('Report requested.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'No se pudo generar el reporte.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Tickets</h2>
      <div className="card tickets-card" style={{ marginTop: '16px' }}>
        <div className="tickets-card__header">
          <h3>All Tickets</h3>
        </div>
        <div className="tickets-toolbar">
          <input
            className="tickets-toolbar__search"
            placeholder="Search tickets..."
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
          />
          <div className="tickets-toolbar__actions">
            <button type="button" className="tickets-toolbar__button" onClick={() => navigate('/tickets/new')}>
              <span className="btnInner">
                <Plus size={16} />
                <span>New</span>
              </span>
            </button>
            {isAdmin ? (
              <button
                type="button"
                className="tickets-toolbar__button danger"
                onClick={handleDelete}
                disabled={selectedIds.size === 0 || actionLoading}
              >
                <span className="btnInner">
                  <Trash2 size={16} />
                  <span>Delete</span>
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="tickets-toolbar__button secondary"
              onClick={handleReport}
              disabled={actionLoading}
            >
              <span className="btnInner">
                <FileText size={16} />
                <span>Report</span>
              </span>
            </button>
          </div>
        </div>
        {feedback ? <p className="form-error">{feedback}</p> : null}
        <table className="table">
          <thead>
            <tr>
              <th className="table__checkbox">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all visible tickets"
                />
              </th>
              {columnDefinitions.map((column) => {
                const triggerRenderer = renderColumnTrigger(column.id, column.label);
                return (
                  <th key={column.id}>
                    <ColumnMenu
                      columnId={column.id}
                      label={column.label}
                      isDate={column.isDate}
                      isOpen={openColumnId === column.id}
                      onToggle={handleToggleColumn}
                      onClose={() => setOpenColumnId(null)}
                      onSort={handleSort}
                      onApplyFilter={handleApplyFilter}
                      onClearFilter={handleClearFilter}
                      currentFilter={columnFilters[column.id]}
                      renderTrigger={triggerRenderer}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayTickets.map((ticket) => (
              <tr key={ticket.id}>
                <td className="table__checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(ticket.id)}
                    onChange={() => handleSelectRow(ticket.id)}
                    aria-label={`Select ticket ${ticket.title}`}
                  />
                </td>
                <td>
                  <Link to={`/tickets/${ticket.id}`}>{ticket.title}</Link>
                </td>
                <td>{ticket.status.name}</td>
                <td>{ticket.priority.name}</td>
                <td>{ticket.ticketType.name}</td>
                <td>{formatDate(ticket.createdAt)}</td>
                <td>{formatDate(ticket.updatedAt)}</td>
                <td>{ticket.createdBy ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : '—'}</td>
                <td>{ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'}</td>
              </tr>
            ))}
            {displayTickets.length === 0 && (
              <tr>
                <td colSpan={9}>No tickets match those filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
