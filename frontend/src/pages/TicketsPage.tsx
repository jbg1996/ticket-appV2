import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useAuth } from '../components/AuthProvider';

type Ticket = {
  id: string;
  title: string;
  status: { id: string; name: string };
  priority: { id: string; name: string };
  ticketType: { id: string; name: string; description: string; defaultPriorityId: string };
};

type TicketType = {
  id: string;
  name: string;
  description: string;
  defaultPriorityId: string;
};

type Priority = { id: string; name: string };

type Status = { id: string; name: string };

export function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [title2, setTitle2] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [filters, setFilters] = useState({ statusId: '', priorityId: '', ticketTypeId: '', assignedToMe: false, createdByMe: false });

  const loadTickets = () => {
    const params = new URLSearchParams();
    if (filters.statusId) params.append('statusId', filters.statusId);
    if (filters.priorityId) params.append('priorityId', filters.priorityId);
    if (filters.ticketTypeId) params.append('ticketTypeId', filters.ticketTypeId);
    if (filters.assignedToMe) params.append('assignedToMe', 'true');
    if (filters.createdByMe) params.append('createdByMe', 'true');
    apiFetch<Ticket[]>(`/api/tickets?${params.toString()}`)
      .then(setTickets)
      .catch(() => setTickets([]));
  };

  useEffect(() => {
    apiFetch<TicketType[]>('/api/catalog/ticket-types').then(setTicketTypes);
    apiFetch<Priority[]>('/api/catalog/priorities').then(setPriorities);
    apiFetch<Status[]>('/api/catalog/statuses').then(setStatuses);
    loadTickets();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filters.statusId, filters.priorityId, filters.ticketTypeId, filters.assignedToMe, filters.createdByMe]);

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

  return (
    <div className="container">
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
              <input
                type="checkbox"
                checked={filters.assignedToMe}
                onChange={(event) => setFilters({ ...filters, assignedToMe: event.target.checked })}
              />
              Assigned to me
            </label>
            <label>
              <input
                type="checkbox"
                checked={filters.createdByMe}
                onChange={(event) => setFilters({ ...filters, createdByMe: event.target.checked })}
              />
              Created by me
            </label>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: '16px' }}>
        <h3>All Tickets</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Type</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
