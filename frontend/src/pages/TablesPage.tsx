import { useEffect, useState } from 'react';
import {
  createPriority,
  createStatus,
  createTicketType,
  deletePriority,
  deleteStatus,
  deleteTicketType,
  getPriorities,
  getStatuses,
  getTicketTypes,
  updatePriority,
  updateStatus,
  updateTicketType
} from '../services/api';
import { ticketPriorityLabel, ticketStatusLabel, ticketTypeLabel } from '../constants/ticketLabels';

type TicketType = {
  id: number;
  code: string;
  label?: string | null;
  description: string;
  defaultPriorityId: number;
  defaultPriority?: { code: string; label?: string | null };
};
type Priority = { id: number; code: string; label?: string | null; color: string };
type Status = { id: number; code: string; label?: string | null; sortOrder: number; color?: string | null };

export function TablesPage() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [newTicketType, setNewTicketType] = useState<{ code: string; description: string; defaultPriorityId: number | '' }>({
    code: '',
    description: '',
    defaultPriorityId: ''
  });
  const [newPriority, setNewPriority] = useState({ code: '', color: '#2563eb' });
  const [newStatus, setNewStatus] = useState({ code: '', sortOrder: 1, color: '#9CA3AF' });
  const [editingTicketTypeId, setEditingTicketTypeId] = useState<number | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<number | null>(null);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [editTicketType, setEditTicketType] = useState<{ code: string; description: string; defaultPriorityId: number | '' }>({
    code: '',
    description: '',
    defaultPriorityId: ''
  });
  const [editPriority, setEditPriority] = useState({ code: '', color: '' });
  const [editStatus, setEditStatus] = useState({ code: '', sortOrder: 1, color: '#9CA3AF' });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadCatalogs = () => {
    getTicketTypes().then((data) => setTicketTypes(data as TicketType[])).catch(() => setTicketTypes([]));
    getPriorities().then((data) => setPriorities(data as Priority[])).catch(() => setPriorities([]));
    getStatuses().then((data) => setStatuses(data as Status[])).catch(() => setStatuses([]));
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  const handleCreateTicketType = async () => {
    if (!newTicketType.defaultPriorityId) return;
    setLoading(true);
    try {
      await createTicketType({ ...newTicketType, defaultPriorityId: Number(newTicketType.defaultPriorityId) });
      setNewTicketType({ code: '', description: '', defaultPriorityId: '' });
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePriority = async () => {
    setLoading(true);
    try {
      await createPriority(newPriority);
      setNewPriority({ code: '', color: '#2563eb' });
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStatus = async () => {
    setLoading(true);
    try {
      await createStatus(newStatus);
      setNewStatus({ code: '', sortOrder: 1, color: '#9CA3AF' });
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTicketType = (item: TicketType) => {
    setEditingTicketTypeId(item.id);
    setEditTicketType({ code: item.code, description: item.description, defaultPriorityId: item.defaultPriorityId });
  };
  const handleEditPriority = (item: Priority) => {
    setEditingPriorityId(item.id);
    setEditPriority({ code: item.code, color: item.color });
  };
  const handleEditStatus = (item: Status) => {
    setEditingStatusId(item.id);
    setEditStatus({ code: item.code, sortOrder: item.sortOrder, color: item.color ?? '#9CA3AF' });
  };

  return (
    <div className="page">
      <h2>Tables</h2>
      <div className="grid grid-2">
        <div className="card">
          <h3>Ticket Types</h3>
          <input placeholder="Code" value={newTicketType.code} onChange={(event) => setNewTicketType({ ...newTicketType, code: event.target.value })} />
          <input placeholder="Description" value={newTicketType.description} onChange={(event) => setNewTicketType({ ...newTicketType, description: event.target.value })} />
          <select value={newTicketType.defaultPriorityId.toString()} onChange={(event) => setNewTicketType({ ...newTicketType, defaultPriorityId: event.target.value ? Number(event.target.value) : '' })}>
            <option value="">Default Priority</option>
            {priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>{ticketPriorityLabel(priority.label ?? priority.code)}</option>
            ))}
          </select>
          <button onClick={handleCreateTicketType} disabled={loading}>Create</button>
          <ul className="list">{ticketTypes.map((item) => <li key={item.id}>{ticketTypeLabel(item.label ?? item.code)}</li>)}</ul>
          {editingTicketTypeId ? <button onClick={async () => { await updateTicketType(editingTicketTypeId, { ...editTicketType, defaultPriorityId: Number(editTicketType.defaultPriorityId) }); setEditingTicketTypeId(null); loadCatalogs(); }}>Save type</button> : null}
          {ticketTypes.map((item) => <button key={`edit-${item.id}`} onClick={() => handleEditTicketType(item)}>Edit {ticketTypeLabel(item.label ?? item.code)}</button>)}
          {ticketTypes.map((item) => <button key={`delete-${item.id}`} onClick={() => deleteTicketType(item.id).then(loadCatalogs)}>Delete {ticketTypeLabel(item.label ?? item.code)}</button>)}
        </div>

        <div className="card">
          <h3>Priorities</h3>
          <input placeholder="Code" value={newPriority.code} onChange={(event) => setNewPriority({ ...newPriority, code: event.target.value })} />
          <input placeholder="Color" value={newPriority.color} onChange={(event) => setNewPriority({ ...newPriority, color: event.target.value })} />
          <button onClick={handleCreatePriority} disabled={loading}>Create</button>
          <ul className="list">{priorities.map((item) => <li key={item.id}>{ticketPriorityLabel(item.label ?? item.code)}</li>)}</ul>
          {editingPriorityId ? <button onClick={async () => { await updatePriority(editingPriorityId, editPriority); setEditingPriorityId(null); loadCatalogs(); }}>Save priority</button> : null}
          {priorities.map((item) => <button key={`edit-pr-${item.id}`} onClick={() => handleEditPriority(item)}>Edit {ticketPriorityLabel(item.label ?? item.code)}</button>)}
          {priorities.map((item) => <button key={`delete-pr-${item.id}`} onClick={() => deletePriority(item.id).then(loadCatalogs)}>Delete {ticketPriorityLabel(item.label ?? item.code)}</button>)}
        </div>

        <div className="card">
          <h3>Statuses</h3>
          <input placeholder="Code" value={newStatus.code} onChange={(event) => setNewStatus({ ...newStatus, code: event.target.value })} />
          <input placeholder="Sort order" type="number" value={newStatus.sortOrder} onChange={(event) => setNewStatus({ ...newStatus, sortOrder: Number(event.target.value) })} />
          <input placeholder="Color" value={newStatus.color} onChange={(event) => setNewStatus({ ...newStatus, color: event.target.value })} />
          <button onClick={handleCreateStatus} disabled={loading}>Create</button>
          <ul className="list">{statuses.map((item) => <li key={item.id}>{ticketStatusLabel(item.label ?? item.code)}</li>)}</ul>
          {editingStatusId ? <button onClick={async () => { await updateStatus(editingStatusId, editStatus); setEditingStatusId(null); loadCatalogs(); }}>Save status</button> : null}
          {statuses.map((item) => <button key={`edit-st-${item.id}`} onClick={() => handleEditStatus(item)}>Edit {ticketStatusLabel(item.label ?? item.code)}</button>)}
          {statuses.map((item) => <button key={`delete-st-${item.id}`} onClick={() => deleteStatus(item.id).then(loadCatalogs)}>Delete {ticketStatusLabel(item.label ?? item.code)}</button>)}
        </div>
      </div>
      {errorMessage ? <p style={{ color: '#b91c1c' }}>{errorMessage}</p> : null}
    </div>
  );
}
