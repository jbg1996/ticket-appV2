import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../services/api';
import { ticketPriorityLabel, ticketStatusLabel, ticketTypeLabel } from '../constants/ticketLabels';
import { useAuth } from '../components/AuthProvider';
import { ColumnHeaderTrigger } from '../components/ColumnHeaderTrigger';
import { ColumnMenu } from '../components/ColumnMenu';
import { ReportIcon } from '../components/icons/ReportIcon';
import { DEFAULT_TICKET_VIEW_BY_ROLE, getAllowedTicketViews, type TicketViewKey } from '../constants/ticketViews';
import type { ColumnFilter, DateFilterPreset } from '../components/ColumnMenu';

type Ticket = {
  id: number;
  code?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: { id: number; name: string; color?: string | null };
  priority: { id: number; name: string; color?: string | null };
  ticketType: { id: number; name: string; description: string; defaultPriorityId: number };
  createdBy?: { id: number; firstName: string; lastName: string } | null;
  assignedTo?: { id: number; firstName: string; lastName: string } | null;
};

type SortState = { columnId: string; direction: 'asc' | 'desc' };
type PaginatedTicketsResponse = {
  data: Ticket[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ColumnDefinition = {
  id: string;
  label: string;
  accessor: (ticket: Ticket) => string | number | null | undefined;
  isDate?: boolean;
};

const formatDate = (value: string) => new Date(value).toLocaleString();
const formatTicketDisplayName = (ticket: Pick<Ticket, 'code' | 'title'>) =>
  ticket.code ? `${ticket.code} - ${ticket.title}` : ticket.title;

function normalizeHexColor(input?: string | null, fallback = '#9CA3AF'): string {
  if (!input) return fallback;
  const c = input.trim();
  const withHash = c.startsWith('#') ? c : `#${c}`;
  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(withHash)) return withHash;
  return fallback;
}

function getContrastTextColor(bgHex: string): '#000000' | '#FFFFFF' {
  const hex = bgHex.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const allowedViews = useMemo(() => getAllowedTicketViews(user?.role), [user?.role]);
  const [selectedView, setSelectedView] = useState<TicketViewKey | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const loadTickets = async (
    nextPage = page,
    nextPageSize = pageSize,
    searchValue = globalSearch,
    view = selectedView
  ) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        page: nextPage.toString(),
        pageSize: nextPageSize.toString()
      });
      if (searchValue.trim()) {
        params.set('text', searchValue.trim());
      }
      if (view) {
        params.set('view', view);
      }
      const response = await apiFetch<PaginatedTicketsResponse>(`/api/tickets?${params.toString()}`);
      setTickets(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      if (response.page !== nextPage) {
        setPage(response.page);
      }
    } catch {
      setTickets([]);
      setTotal(0);
      setTotalPages(1);
      setLoadError('No se pudieron cargar los tickets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.role) return;
    const defaultView = DEFAULT_TICKET_VIEW_BY_ROLE[user.role];
    if (selectedView === null) {
      setSelectedView(defaultView);
    }
  }, [user?.role, selectedView]);

  useEffect(() => {
    if (!selectedView) return;
    loadTickets(page, pageSize, globalSearch, selectedView);
  }, [page, pageSize, globalSearch, selectedView]);

  useEffect(() => {
    setSelectedIds((prev) => new Set([...prev].filter((id) => tickets.some((ticket) => ticket.id === id))));
  }, [tickets]);

  const columnDefinitions: ColumnDefinition[] = useMemo(
    () => [
      { id: 'title', label: 'Title', accessor: (ticket) => formatTicketDisplayName(ticket) },
      { id: 'status', label: 'Status', accessor: (ticket) => ticketStatusLabel(ticket.status?.name ?? '') },
      { id: 'priority', label: 'Priority', accessor: (ticket) => ticketPriorityLabel(ticket.priority?.name ?? '') },
      { id: 'type', label: 'Type', accessor: (ticket) => ticketTypeLabel(ticket.ticketType?.name ?? '') },
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

  const displayTickets = useMemo(() => applyAll(tickets), [tickets, columnFilters, sorting]);
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
      const response = await apiFetch<{ deletedCount: number }>('/api/tickets/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      setSelectedIds(new Set());
      setFeedback(`Tickets deleted. (${response.deletedCount})`);
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
      const ticketQuery = {
        q: globalSearch.trim() || undefined,
        filters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
        sort: sorting ? { column: sorting.columnId, direction: sorting.direction } : undefined
      };
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          source: 'tickets',
          ticketQuery
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
          <h3>{allowedViews.find((view) => view.key === selectedView)?.label ?? 'Tickets'}</h3>
        </div>
        <div className="tickets-toolbar">
          <div className="tickets-toolbar__view">
            <label htmlFor="ticket-view-select">View</label>
            <select
              id="ticket-view-select"
              value={selectedView ?? ''}
              onChange={(event) => {
                setSelectedView(event.target.value as TicketViewKey);
                setPage(1);
              }}
              title={allowedViews.find((view) => view.key === selectedView)?.description}
            >
              {allowedViews.map((view) => (
                <option key={view.key} value={view.key}>
                  {view.label}
                </option>
              ))}
            </select>
          </div>
          <input
            className="tickets-toolbar__search"
            placeholder="Search tickets..."
            value={globalSearch}
            onChange={(event) => {
              setGlobalSearch(event.target.value);
              setPage(1);
            }}
          />
          <div className="tickets-toolbar__actions">
            <button type="button" className="tickets-toolbar__button" onClick={() => navigate('/tickets/new')}>
              <span className="btnInner">
                <Plus size={16} className="tickets-toolbar__button-icon" />
                <span>New</span>
              </span>
            </button>
            {isAdmin ? (
              <button
                type="button"
                className="tickets-toolbar__button danger inline-flex items-center gap-2"
                onClick={handleDelete}
                disabled={selectedIds.size === 0 || actionLoading}
              >
                <span className="btnInner">
                  <Trash2 size={16} className="tickets-toolbar__button-icon" />
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
                <ReportIcon size={16} className="tickets-toolbar__button-icon" />
                <span>Report</span>
              </span>
            </button>
          </div>
        </div>
        {feedback ? <p className="form-error">{feedback}</p> : null}
        {loadError ? <p className="form-error">{loadError}</p> : null}
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
              {columnDefinitions.map((column) => (
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
                    renderTrigger={({ label, onToggle, isOpen }) => (
                      <ColumnHeaderTrigger label={label} onToggle={onToggle} isOpen={isOpen} />
                    )}
                  />
                </th>
              ))}
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
                    aria-label={`Select ticket ${formatTicketDisplayName(ticket)}`}
                  />
                </td>
                <td>
                  <Link to={`/tickets/${ticket.id}`}>{formatTicketDisplayName(ticket)}</Link>
                </td>
                <td>{ticketStatusLabel(ticket.status.name)}</td>
                <td>
                  {(() => {
                    const priorityName = ticket.priority?.name;
                    const bg = normalizeHexColor(ticket.priority?.color);
                    const fg = getContrastTextColor(bg);
                    return (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: bg, color: fg }}
                        title={priorityName ?? 'No priority'}
                      >
                        {priorityName ? ticketPriorityLabel(priorityName) : '—'}
                      </span>
                    );
                  })()}
                </td>
                <td>{ticketTypeLabel(ticket.ticketType.name)}</td>
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
        <div className="tickets-pagination" aria-label="Ticket pagination controls">
          <span className="tickets-pagination__summary">
            {isLoading ? 'Loading tickets...' : `${total} tickets`}
          </span>
          <div className="tickets-pagination__controls">
            <div className="tickets-pagination__page-size">
              <label htmlFor="tickets-page-size">Rows</label>
              <select
                id="tickets-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button type="button" className="tickets-toolbar__button secondary" onClick={() => setPage((prev) => prev - 1)} disabled={page <= 1 || isLoading}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="tickets-toolbar__button secondary"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page >= totalPages || isLoading}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
