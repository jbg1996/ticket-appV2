import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { useAuth } from '../components/AuthProvider';
import { ticketPriorityLabel, ticketTypeLabel } from '../utils/ticketLabels';

type TicketType = {
  id: number;
  name: string;
  description: string;
  defaultPriorityId: number;
};

type Priority = { id: number; name: string };

type TicketResponse = { id: number };

export function CreateTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [selectedType, setSelectedType] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [title2, setTitle2] = useState('');
  const [priorityId, setPriorityId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<TicketType[]>('/api/catalog/ticket-types').then(setTicketTypes);
    apiFetch<Priority[]>('/api/catalog/priorities').then(setPriorities);
  }, []);

  useEffect(() => {
    if (!selectedType) return;
    const selected = ticketTypes.find((type) => type.id === selectedType);
    if (!selected) return;
    setDescription(selected.description);
    setPriorityId(selected.defaultPriorityId);
  }, [selectedType, ticketTypes]);

  const selectedTypeData = ticketTypes.find((type) => type.id === selectedType);
  const title = selectedTypeData?.name ?? '';

  const isCustomTitle = useMemo(() => selectedTypeData?.name === 'OTHER', [selectedTypeData]);

  const handleCreate = async () => {
    if (!selectedType) return;
    setSaving(true);
    setError('');
    try {
      const response = await apiFetch<TicketResponse>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          ticketTypeId: Number(selectedType),
          description,
          priorityId: priorityId ? Number(priorityId) : undefined,
          title2
        })
      });
      if (response?.id) {
        navigate(`/tickets/${response.id}`);
        return;
      }
      navigate('/tickets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <h2>Create Ticket</h2>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="card">
        <div className="grid">
          <label>
            Ticket Type
            <select
              value={selectedType.toString()}
              onChange={(event) => setSelectedType(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">Select</option>
              {ticketTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {ticketTypeLabel(type.name)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input value={title} readOnly />
          </label>
          {isCustomTitle && (
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
              value={priorityId.toString()}
              onChange={(event) => setPriorityId(event.target.value ? Number(event.target.value) : '')}
              disabled={user?.role === 'REQUESTER'}
            >
              {priorities.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {ticketPriorityLabel(priority.name)}
                </option>
              ))}
            </select>
          </label>
          <button onClick={handleCreate} disabled={saving || !selectedType}>
            {saving ? 'Saving...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
