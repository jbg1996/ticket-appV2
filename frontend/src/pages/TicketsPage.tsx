import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../components/AuthProvider';
import { ColumnFilter, ColumnMenu } from '../components/ColumnMenu';

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
      { id: 'createdAt', label: 'Created At', accessor: (ticket) => ticket.createdAt },
      { id: 'updatedAt', label: 'Updated At', accessor: (ticket) => ticket.updatedAt },
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

  const matchesFilter = (value: string | number | null | undefined, filter: ColumnFilter) => {
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
      result = result.filter((ticket) => matchesFilter(column.accessor(ticket), filter));
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
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card__header">
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
              <Plus size={16} />
              New
            </button>
            {isAdmin ? (
              <button
                type="button"
                className="tickets-toolbar__button danger"
                onClick={handleDelete}
                disabled={selectedIds.size === 0 || actionLoading}
              >
                <Trash2 size={16} />
                Delete
              </button>
            ) : null}
            <button
              type="button"
              className="tickets-toolbar__button secondary"
              onClick={handleReport}
              disabled={actionLoading}
            >
              <FileText size={16} />
              Report
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
              {columnDefinitions.map((column) => (
                <th key={column.id}>
                  <ColumnMenu
                    columnId={column.id}
                    label={column.label}
                    isOpen={openColumnId === column.id}
                    onToggle={handleToggleColumn}
                    onClose={() => setOpenColumnId(null)}
                    onSort={handleSort}
                    onApplyFilter={handleApplyFilter}
                    onClearFilter={handleClearFilter}
                    currentFilter={columnFilters[column.id]}
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
