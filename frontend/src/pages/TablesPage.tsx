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
type TicketType = { id: string; name: string; description: string; defaultPriorityId: string; defaultPriority?: { name: string } };
type Priority = { id: string; name: string; color: string };
type Status = { id: string; name: string; sortOrder: number };

export function TablesPage() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [newTicketType, setNewTicketType] = useState({ name: '', description: '', defaultPriorityId: '' });
  const [newPriority, setNewPriority] = useState({ name: '', color: '#2563eb' });
  const [newStatus, setNewStatus] = useState({ name: '', sortOrder: 1 });
  const [editingTicketTypeId, setEditingTicketTypeId] = useState<string | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editTicketType, setEditTicketType] = useState({ name: '', description: '', defaultPriorityId: '' });
  const [editPriority, setEditPriority] = useState({ name: '', color: '' });
  const [editStatus, setEditStatus] = useState({ name: '', sortOrder: 1 });
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
      await createTicketType(newTicketType);
      setNewTicketType({ name: '', description: '', defaultPriorityId: '' });
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePriority = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await createPriority(newPriority);
      setNewPriority({ name: '', color: '#2563eb' });
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStatus = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await createStatus(newStatus);
      setNewStatus({ name: '', sortOrder: 1 });
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
    setEditPriority({ name: item.name, color: item.color });
  };

  const handleEditStatus = (item: Status) => {
    setEditingStatusId(item.id);
    setEditStatus({ name: item.name, sortOrder: item.sortOrder });
  };

  const handleSaveTicketType = async () => {
    if (!editingTicketTypeId) return;
    setLoading(true);
    setErrorMessage('');
    try {
      await updateTicketType(editingTicketTypeId, editTicketType);
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

  const handleDeleteTicketType = async (id: string) => {
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

  const handleDeletePriority = async (id: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      await deletePriority(id);
      loadCatalogs();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      await deleteStatus(id);
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
              value={newTicketType.defaultPriorityId}
              onChange={(event) => setNewTicketType({ ...newTicketType, defaultPriorityId: event.target.value })}
            >
              <option value="">Default Priority</option>
              {priorities.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.name}
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
                  <button className="secondary" onClick={() => handleDeleteTicketType(item.id)} disabled={loading}>Delete</button>
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
                value={editTicketType.defaultPriorityId}
                onChange={(event) => setEditTicketType({ ...editTicketType, defaultPriorityId: event.target.value })}
              >
                <option value="">Default Priority</option>
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
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
          <div className="grid">
            <input
              placeholder="Name"
              value={newPriority.name}
              onChange={(event) => setNewPriority({ ...newPriority, name: event.target.value })}
            />
            <input
              placeholder="Color"
              value={newPriority.color}
              onChange={(event) => setNewPriority({ ...newPriority, color: event.target.value })}
            />
            <button onClick={handleCreatePriority} disabled={loading}>Create</button>
          </div>
          <ul className="list">
            {priorities.map((item) => (
              <li key={item.id} className="list__item">
                <div>
                  <div>{item.name}</div>
                  <div className="list__meta">{item.color}</div>
                </div>
                <div className="action-row">
                  <button onClick={() => handleEditPriority(item)} disabled={loading}>Edit</button>
                  <button className="secondary" onClick={() => handleDeletePriority(item.id)} disabled={loading}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
          {editingPriorityId && (
            <div className="grid" style={{ marginTop: '12px' }}>
              <input
                placeholder="Name"
                value={editPriority.name}
                onChange={(event) => setEditPriority({ ...editPriority, name: event.target.value })}
              />
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
          <div className="grid">
            <input
              placeholder="Name"
              value={newStatus.name}
              onChange={(event) => setNewStatus({ ...newStatus, name: event.target.value })}
            />
            <input
              placeholder="Sort order"
              type="number"
              value={newStatus.sortOrder}
              onChange={(event) => setNewStatus({ ...newStatus, sortOrder: Number(event.target.value) })}
            />
            <button onClick={handleCreateStatus} disabled={loading}>Create</button>
          </div>
          <ul className="list">
            {statuses.map((item) => (
              <li key={item.id} className="list__item">
                <div>
                  <div>{item.name}</div>
                  <div className="list__meta">Order: {item.sortOrder}</div>
                </div>
                <div className="action-row">
                  <button onClick={() => handleEditStatus(item)} disabled={loading}>Edit</button>
                  <button className="secondary" onClick={() => handleDeleteStatus(item.id)} disabled={loading}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
          {editingStatusId && (
            <div className="grid" style={{ marginTop: '12px' }}>
              <input
                placeholder="Name"
                value={editStatus.name}
                onChange={(event) => setEditStatus({ ...editStatus, name: event.target.value })}
              />
              <input
                placeholder="Sort order"
                type="number"
                value={editStatus.sortOrder}
                onChange={(event) => setEditStatus({ ...editStatus, sortOrder: Number(event.target.value) })}
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
