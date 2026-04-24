import { useEffect, useState } from 'react';
import {
  createTicketType,
  deleteTicketType,
  getPriorities,
  getStatuses,
  getTicketTypes,
  updatePriority,
  updateStatus,
  updateTicketType
} from '../services/api';
import { ticketPriorityLabel } from '../constants/ticketLabels';

type TicketType = { id: number; name: string; description: string; defaultPriorityId: number; defaultPriority?: { name: string } };
type Priority = { id: number; name: string; color: string };
type Status = { id: number; name: string; sortOrder: number; color?: string | null };

export function TablesPage() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [newTicketType, setNewTicketType] = useState<{ name: string; description: string; defaultPriorityId: number | '' }>({
    name: '',
    description: '',
    defaultPriorityId: ''
  });
  const [editingTicketTypeId, setEditingTicketTypeId] = useState<number | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<number | null>(null);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [editTicketType, setEditTicketType] = useState<{ name: string; description: string; defaultPriorityId: number | '' }>({
    name: '',
    description: '',
    defaultPriorityId: ''
  });
  const [editPriority, setEditPriority] = useState({ color: '' });
  const [editStatus, setEditStatus] = useState({ color: '#9CA3AF' });
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
    setLoading(true);
    setErrorMessage('');
    try {
      if (!newTicketType.defaultPriorityId) {
        throw new Error('Select a default priority.');
      }
      await createTicketType({
        ...newTicketType,
        defaultPriorityId: Number(newTicketType.defaultPriorityId)
      });
      setNewTicketType({ name: '', description: '', defaultPriorityId: '' });
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTicketType = (item: TicketType) => {
    setEditingTicketTypeId(item.id);
    setEditTicketType({ name: item.name, description: item.description, defaultPriorityId: item.defaultPriorityId });
  };

  const handleEditPriority = (item: Priority) => {
    setEditingPriorityId(item.id);
    setEditPriority({ color: item.color });
  };

  const handleEditStatus = (item: Status) => {
    setEditingStatusId(item.id);
    setEditStatus({ color: item.color ?? '#9CA3AF' });
  };

  const handleSaveTicketType = async () => {
    if (!editingTicketTypeId) return;
    setLoading(true);
    setErrorMessage('');
    try {
      await updateTicketType(editingTicketTypeId, {
        ...editTicketType,
        defaultPriorityId: editTicketType.defaultPriorityId ? Number(editTicketType.defaultPriorityId) : undefined
      });
      setEditingTicketTypeId(null);
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePriority = async () => {
    if (!editingPriorityId) return;
    setLoading(true);
    setErrorMessage('');
    try {
      await updatePriority(editingPriorityId, editPriority);
      setEditingPriorityId(null);
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!editingStatusId) return;
    setLoading(true);
    setErrorMessage('');
    try {
      await updateStatus(editingStatusId, editStatus);
      setEditingStatusId(null);
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicketType = async (id: number) => {
    setLoading(true);
    setErrorMessage('');
    try {
      await deleteTicketType(id);
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Tables</h2>
      <p className="page__subtitle">Maintain ticket catalogs (types, priorities, statuses).</p>
      <div className="grid grid-2">
        <div className="card">
          <h3>Ticket Types</h3>
          <div className="grid">
            <input
              placeholder="Name"
              value={newTicketType.name}
              onChange={(event) => setNewTicketType({ ...newTicketType, name: event.target.value })}
            />
            <input
              placeholder="Description"
              value={newTicketType.description}
              onChange={(event) => setNewTicketType({ ...newTicketType, description: event.target.value })}
            />
            <select
              value={newTicketType.defaultPriorityId.toString()}
              onChange={(event) =>
                setNewTicketType({
                  ...newTicketType,
                  defaultPriorityId: event.target.value ? Number(event.target.value) : ''
                })
              }
            >
              <option value="">Default Priority</option>
              {priorities.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {ticketPriorityLabel(priority.name)}
                </option>
              ))}
            </select>
            <button onClick={handleCreateTicketType} disabled={loading}>Create</button>
          </div>
          <ul className="list">
            {ticketTypes.map((item) => (
              <li key={item.id} className="list__item">
                <div>
                  <div>{item.name}</div>
                  <div className="list__meta">{item.description}</div>
                  {item.defaultPriority && <div className="list__meta">Default: {item.defaultPriority.name}</div>}
                </div>
                <div className="action-row">
                  <button onClick={() => handleEditTicketType(item)} disabled={loading}>Edit</button>
                  {item.name.trim().toUpperCase() !== 'OTHER' && (
                    <button className="secondary" onClick={() => handleDeleteTicketType(item.id)} disabled={loading}>Delete</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {editingTicketTypeId && (
            <div className="grid" style={{ marginTop: '12px' }}>
              <input
                placeholder="Name"
                value={editTicketType.name}
                onChange={(event) => setEditTicketType({ ...editTicketType, name: event.target.value })}
              />
              <input
                placeholder="Description"
                value={editTicketType.description}
                onChange={(event) => setEditTicketType({ ...editTicketType, description: event.target.value })}
              />
              <select
                value={editTicketType.defaultPriorityId.toString()}
                onChange={(event) =>
                  setEditTicketType({
                    ...editTicketType,
                    defaultPriorityId: event.target.value ? Number(event.target.value) : ''
                  })
                }
              >
                <option value="">Default Priority</option>
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {ticketPriorityLabel(priority.name)}
                  </option>
                ))}
              </select>
              <div className="action-row">
                <button onClick={handleSaveTicketType} disabled={loading}>Save</button>
                <button className="secondary" onClick={() => setEditingTicketTypeId(null)} disabled={loading}>Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h3>Priorities</h3>
          <ul className="list">
            {priorities.map((item) => (
              <li key={item.id} className="list__item">
                <div>
                  <div>{item.name}</div>
                  <div className="list__meta">{item.color}</div>
                </div>
                <div className="action-row">
                  <button onClick={() => handleEditPriority(item)} disabled={loading}>Edit color</button>
                </div>
              </li>
            ))}
          </ul>
          {editingPriorityId && (
            <div className="grid" style={{ marginTop: '12px' }}>
              <input
                placeholder="Color"
                value={editPriority.color}
                onChange={(event) => setEditPriority({ ...editPriority, color: event.target.value })}
              />
              <div className="action-row">
                <button onClick={handleSavePriority} disabled={loading}>Save</button>
                <button className="secondary" onClick={() => setEditingPriorityId(null)} disabled={loading}>Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h3>Statuses</h3>
          <ul className="list">
            {statuses.map((item) => (
              <li key={item.id} className="list__item">
                <div>
                  <div>{item.name}</div>
                  <div className="list__meta">Order: {item.sortOrder}</div>
                  <div className="list__meta">Color: {item.color ?? '#9CA3AF'}</div>
                </div>
                <div className="action-row">
                  <button onClick={() => handleEditStatus(item)} disabled={loading}>Edit color</button>
                </div>
              </li>
            ))}
          </ul>
          {editingStatusId && (
            <div className="grid" style={{ marginTop: '12px' }}>
              <input
                placeholder="Color (HEX)"
                value={editStatus.color}
                onChange={(event) => setEditStatus({ ...editStatus, color: event.target.value })}
              />
              <div className="action-row">
                <button onClick={handleSaveStatus} disabled={loading}>Save</button>
                <button className="secondary" onClick={() => setEditingStatusId(null)} disabled={loading}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {errorMessage && <p style={{ color: '#b91c1c' }}>{errorMessage}</p>}
    </div>
  );
}
