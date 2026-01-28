import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useAuth } from '../components/AuthProvider';

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

type TicketType = {
  id: string;
  name: string;
  description: string;
  defaultPriorityId: string;
};

type Priority = { id: string; name: string };

type Status = { id: string; name: string };

type UserSummary = { id: string; firstName: string; lastName: string; userType: { name: string; code: string } };

type FiltersState = {
  statusId: string;
  priorityId: string;
  ticketTypeId: string;
  assignedToMe: boolean;
  createdByMe: boolean;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  createdById: string;
  assignedToId: string;
  text: string;
};

const buildDateTime = (value: string, endOfDay = false) => {
  if (!value) return undefined;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  return new Date(`${value}${suffix}`).toISOString();
};

const formatDate = (value: string) => new Date(value).toLocaleString();

export function TicketsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [title2, setTitle2] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [filters, setFilters] = useState<FiltersState>({
    statusId: '',
    priorityId: '',
    ticketTypeId: '',
    assignedToMe: false,
    createdByMe: false,
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
    createdById: '',
    assignedToId: '',
    text: ''
  });

  const buildParams = () => {
    const params = new URLSearchParams();
    if (filters.statusId) params.append('statusId', filters.statusId);
    if (filters.priorityId) params.append('priorityId', filters.priorityId);
    if (filters.ticketTypeId) params.append('ticketTypeId', filters.ticketTypeId);
    if (filters.assignedToMe) params.append('assignedToMe', 'true');
    if (filters.createdByMe) params.append('createdByMe', 'true');
    if (filters.createdById) params.append('createdById', filters.createdById);
    if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);
    if (filters.text) params.append('text', filters.text);

    const createdFrom = buildDateTime(filters.createdFrom);
    const createdTo = buildDateTime(filters.createdTo, true);
    const updatedFrom = buildDateTime(filters.updatedFrom);
    const updatedTo = buildDateTime(filters.updatedTo, true);
    if (createdFrom) params.append('createdFrom', createdFrom);
    if (createdTo) params.append('createdTo', createdTo);
    if (updatedFrom) params.append('updatedFrom', updatedFrom);
    if (updatedTo) params.append('updatedTo', updatedTo);

    return params;
  };

  const loadTickets = () => {
    const params = buildParams();
    apiFetch<Ticket[]>(`/api/tickets?${params.toString()}`)
      .then(setTickets)
      .catch(() => setTickets([]));
  };

  useEffect(() => {
    apiFetch<TicketType[]>('/api/catalog/ticket-types').then(setTicketTypes);
    apiFetch<Priority[]>('/api/catalog/priorities').then(setPriorities);
    apiFetch<Status[]>('/api/catalog/statuses').then(setStatuses);
    apiFetch<UserSummary[]>('/api/users/summary').then(setUsers).catch(() => setUsers([]));
    loadTickets();
  }, []);

  useEffect(() => {
    const params = buildParams();
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
    loadTickets();
  }, [filters]);

  useEffect(() => {
    if (!selectedType) return;
    const selected = ticketTypes.find((type) => type.id === selectedType);
    if (!selected) return;
    setDescription(selected.description);
    setPriorityId(selected.defaultPriorityId);
  }, [selectedType, ticketTypes]);

  const handleCreate = async () => {
    if (!selectedType) return;
    await apiFetch('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({
        ticketTypeId: selectedType,
        description,
        priorityId,
        title2
      })
    });
    setDescription('');
    setTitle2('');
    loadTickets();
  };

  const selectedTypeData = ticketTypes.find((type) => type.id === selectedType);
  const title = selectedTypeData?.name ?? '';

  const filteredUsers = useMemo(
    () =>
      users.map((userItem) => ({
        id: userItem.id,
        name: `${userItem.firstName} ${userItem.lastName}`,
        role: userItem.userType.code
      })),
    [users]
  );

  return (
    <div className="page">
      <h2>Tickets</h2>
      <div className="grid grid-2">
        <div className="card">
          <h3>Create Ticket</h3>
          <div className="grid">
            <label>
              Ticket Type
              <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                <option value="">Select</option>
                {ticketTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input value={title} readOnly />
            </label>
            {selectedTypeData?.name === 'OTROS' && (
              <label>
                Custom Title
                <input value={title2} onChange={(event) => setTitle2(event.target.value)} />
              </label>
            )}
            <label>
              Description
              <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <label>
              Priority
              <select
                value={priorityId}
                onChange={(event) => setPriorityId(event.target.value)}
                disabled={user?.role === 'REQUESTER'}
              >
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={handleCreate}>Create</button>
          </div>
        </div>
        <div className="card">
          <h3>Filters</h3>
          <div className="grid">
            <label>
              Text search
              <input
                value={filters.text}
                onChange={(event) => setFilters({ ...filters, text: event.target.value })}
                placeholder="Search title, description, code"
              />
            </label>
            <label>
              Status
              <select value={filters.statusId} onChange={(event) => setFilters({ ...filters, statusId: event.target.value })}>
                <option value="">All</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={filters.priorityId} onChange={(event) => setFilters({ ...filters, priorityId: event.target.value })}>
                <option value="">All</option>
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select value={filters.ticketTypeId} onChange={(event) => setFilters({ ...filters, ticketTypeId: event.target.value })}>
                <option value="">All</option>
                {ticketTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Created from
              <input
                type="date"
                value={filters.createdFrom}
                onChange={(event) => setFilters({ ...filters, createdFrom: event.target.value })}
              />
            </label>
            <label>
              Created to
              <input
                type="date"
                value={filters.createdTo}
                onChange={(event) => setFilters({ ...filters, createdTo: event.target.value })}
              />
            </label>
            <label>
              Updated from
              <input
                type="date"
                value={filters.updatedFrom}
                onChange={(event) => setFilters({ ...filters, updatedFrom: event.target.value })}
              />
            </label>
            <label>
              Updated to
              <input
                type="date"
                value={filters.updatedTo}
                onChange={(event) => setFilters({ ...filters, updatedTo: event.target.value })}
              />
            </label>
            <label>
              Created by
              <select
                value={filters.createdById}
                onChange={(event) => setFilters({ ...filters, createdById: event.target.value })}
              >
                <option value="">All</option>
                {filteredUsers.map((userItem) => (
                  <option key={userItem.id} value={userItem.id}>
                    {userItem.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assigned to
              <select
                value={filters.assignedToId}
                onChange={(event) => setFilters({ ...filters, assignedToId: event.target.value })}
              >
                <option value="">All</option>
                {filteredUsers.map((userItem) => (
                  <option key={userItem.id} value={userItem.id}>
                    {userItem.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="filters-checks">
              <label className="check-row" htmlFor="assigned-to-me">
                <span className="check-row__text">Assigned to me</span>
                <input
                  className="check-row__input"
                  id="assigned-to-me"
                  type="checkbox"
                  checked={filters.assignedToMe}
                  onChange={(event) => setFilters({ ...filters, assignedToMe: event.target.checked })}
                />
              </label>
              <label className="check-row" htmlFor="created-by-me">
                <span className="check-row__text">Created by me</span>
                <input
                  className="check-row__input"
                  id="created-by-me"
                  type="checkbox"
                  checked={filters.createdByMe}
                  onChange={(event) => setFilters({ ...filters, createdByMe: event.target.checked })}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card__header">
          <h3>All Tickets</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Type</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Created By</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
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
            {tickets.length === 0 && (
              <tr>
                <td colSpan={8}>No tickets match those filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
