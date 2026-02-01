import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Paperclip } from 'lucide-react';
import { apiFetch, apiFetchBlob, apiUpload } from '../services/api';
import { useAuth } from '../components/AuthProvider';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: { id: string; name: string };
  priority: { id: string; name: string };
  ticketType: { name: string };
  assignedTo?: { firstName: string; lastName: string } | null;
  attachments: { id: string; originalName: string }[];
  history: { id: string; eventType: string; message?: string; createdAt: string; actor: { firstName: string; lastName: string } }[];
  infoRequests: { id: string; message: string; status: string; requesterTech: { firstName: string; lastName: string }; responses: { id: string; message: string; responder: { firstName: string; lastName: string } }[] }[];
};

type Status = { id: string; name: string };

type Priority = { id: string; name: string };

type User = { id: string; firstName: string; lastName: string; isActive: boolean; userType: { name: string } };

export function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [requestedFields, setRequestedFields] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriorityId, setEditPriorityId] = useState('');
  const [adminError, setAdminError] = useState('');
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const loadTicket = async () => {
    if (!id) {
      setTicket(null);
      setError('Ticket not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Ticket>(`/api/tickets/${id}`);
      setTicket(data);
      setEditDescription(data.description);
      setEditPriorityId(data.priority.id);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      setTicket(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchTicket = async () => {
      if (!id) {
        if (!cancelled) {
          setTicket(null);
          setError('Ticket not found.');
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<Ticket>(`/api/tickets/${id}`);
        if (cancelled) return;
        setTicket(data);
        setEditDescription(data.description);
        setEditPriorityId(data.priority.id);
      } catch (fetchError) {
        if (cancelled) return;
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        setTicket(null);
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTicket();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    apiFetch<Status[]>('/api/catalog/statuses').then(setStatuses);
    apiFetch<Priority[]>('/api/catalog/priorities').then(setPriorities);
    if (isAdmin) {
      apiFetch<User[]>('/api/users').then((users) =>
        setAssignees(users.filter((candidate) => candidate.isActive && candidate.userType.name === 'Técnico'))
      );
    }
  }, [isAdmin]);

  const filteredAssignees = useMemo(() => {
    const query = assigneeQuery.trim().toLowerCase();
    if (!query) return assignees;
    return assignees.filter((assignee) =>
      `${assignee.firstName} ${assignee.lastName}`.toLowerCase().includes(query)
    );
  }, [assigneeQuery, assignees]);

  const handleRequestInfo = async () => {
    if (!id) return;
    await apiFetch(`/api/tickets/${id}/request-info`, {
      method: 'POST',
      body: JSON.stringify({
        message: infoMessage,
        requestedFields: requestedFields
          .split(',')
          .map((field) => field.trim())
          .filter(Boolean)
      })
    });
    setInfoMessage('');
    setRequestedFields('');
    loadTicket();
  };

  const handleRespondInfo = async (infoRequestId: string) => {
    const formData = new FormData();
    formData.append('message', responseMessage);
    if (responseFile) {
      formData.append('file', responseFile);
    }
    await apiUpload(`/api/info-requests/${infoRequestId}/respond`, formData);
    setResponseMessage('');
    setResponseFile(null);
    loadTicket();
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!id || !event.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', event.target.files[0]);
    await apiUpload(`/api/tickets/${id}/attachments`, formData);
    loadTicket();
  };

  const handleDownload = async (attachmentId: string, originalName: string) => {
    const blob = await apiFetchBlob(`/api/attachments/${attachmentId}/download`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleComment = async () => {
    if (!id) return;
    await apiFetch(`/api/tickets/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ message: comment })
    });
    setComment('');
    loadTicket();
  };

  const handleStatusSelect = async (statusId: string) => {
    setSelectedStatusId(statusId);
    if (!id || !statusId) return;
    await apiFetch(`/api/tickets/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ statusId })
    });
    setSelectedStatusId('');
    loadTicket();
  };

  const handleAssignSelect = async (assigneeId: string) => {
    if (!id || !assigneeId) return;
    await apiFetch(`/api/tickets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId })
    });
    setAssigneeOpen(false);
    setAssigneeQuery('');
    loadTicket();
  };

  const handleAdminUpdate = async () => {
    if (!id) return;
    setAdminError('');
    try {
      await apiFetch(`/api/tickets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: editDescription,
          priorityId: editPriorityId
        })
      });
      loadTicket();
    } catch (error) {
      setAdminError('No autorizado');
    }
  };

  const handleAdminDelete = async () => {
    if (!id) return;
    setAdminError('');
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await apiFetch(`/api/tickets/${id}`, { method: 'DELETE' });
      window.location.href = '/tickets';
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'No autorizado');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <h2>Loading ticket...</h2>
          <p>Fetching ticket details.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <h2>Error loading ticket</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="page">
        <div className="card">
          <h2>Ticket not found.</h2>
          <p>The ticket could not be loaded.</p>
        </div>
      </div>
    );
  }

  const assignedName = ticket.assignedTo
    ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
    : 'Unassigned';
  const assignedInitials = ticket.assignedTo
    ? `${ticket.assignedTo.firstName.charAt(0)}${ticket.assignedTo.lastName.charAt(0)}`.toUpperCase()
    : 'UN';

  const statusTone = (() => {
    const normalized = ticket.status.name.toLowerCase();
    if (normalized.includes('open') || normalized.includes('new')) return 'ticket-detail__state-dot--open';
    if (normalized.includes('progress')) return 'ticket-detail__state-dot--progress';
    if (normalized.includes('resolved') || normalized.includes('closed')) return 'ticket-detail__state-dot--closed';
    return 'ticket-detail__state-dot--default';
  })();

  return (
    <div className="page ticket-detail">
      <Tabs defaultValue="details" className="ticket-detail__tabs">
        <div className="ticket-detail__header">
          <div className="ticket-detail__title">
            <div className="ticket-detail__title-row">
              <h1>{ticket.title}</h1>
            </div>
            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
              <div className="ticket-detail__assignee-wrapper">
                <PopoverTrigger className="ticket-detail__assignee" disabled={!isAdmin}>
                  <span className="ticket-detail__avatar" aria-hidden="true">
                    {assignedInitials}
                  </span>
                  <span className="ticket-detail__assignee-name">{assignedName}</span>
                  {isAdmin && <span className="ticket-detail__assignee-action">Cambiar</span>}
                </PopoverTrigger>
                {isAdmin && (
                  <PopoverContent className="ticket-detail__assignee-popover">
                    <input
                      type="text"
                      placeholder="Buscar técnico..."
                      value={assigneeQuery}
                      onChange={(event) => setAssigneeQuery(event.target.value)}
                    />
                    <ul className="ticket-detail__assignee-list">
                      {filteredAssignees.length === 0 && <li className="ticket-detail__assignee-empty">Sin resultados</li>}
                      {filteredAssignees.map((assignee) => (
                        <li key={assignee.id}>
                          <button
                            type="button"
                            onClick={() => handleAssignSelect(assignee.id)}
                            className="ticket-detail__assignee-option"
                          >
                            {assignee.firstName} {assignee.lastName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                )}
              </div>
            </Popover>
            <TabsList className="ticket-detail__tabs-list">
              <TabsTrigger value="details" className="ticket-detail__tab" title="Details">
                Details
              </TabsTrigger>
              <TabsTrigger value="history" className="ticket-detail__tab ticket-detail__tab--icon" title="History">
                <Clock size={16} />
              </TabsTrigger>
              <TabsTrigger value="attachments" className="ticket-detail__tab ticket-detail__tab--icon" title="Attachments">
                <Paperclip size={16} />
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="ticket-detail__meta">
            <div className="ticket-detail__meta-item">
              <span className="ticket-detail__meta-label">Type</span>
              <span className="ticket-detail__meta-value">{ticket.ticketType.name}</span>
            </div>
            <div className="ticket-detail__meta-item">
              <span className="ticket-detail__meta-label">Priority</span>
              <span className="ticket-detail__meta-value">{ticket.priority.name}</span>
            </div>
            <div className="ticket-detail__meta-item">
              <span className="ticket-detail__meta-label">State</span>
              {(user?.role === 'ADMIN' || user?.role === 'TECH') ? (
                <label className="ticket-detail__state-select">
                  <div className="ticket-detail__state-control">
                    <span className={`ticket-detail__state-dot ${statusTone}`} aria-hidden="true" />
                    <select
                      value={selectedStatusId || ticket.status.id}
                      onChange={(event) => handleStatusSelect(event.target.value)}
                    >
                      {statuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              ) : (
                <div className="ticket-detail__state-readonly">
                  <div className="ticket-detail__state-control">
                    <span className={`ticket-detail__state-dot ${statusTone}`} aria-hidden="true" />
                    <span>{ticket.status.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="details" className="ticket-detail__tab-panel">
          <div className="card">
            <h3>Description</h3>
            <p>{ticket.description}</p>
          </div>

          <div className="card">
            <h3>Info Requests</h3>
            {user?.role !== 'REQUESTER' && (
              <div className="grid">
                <textarea rows={2} value={infoMessage} onChange={(event) => setInfoMessage(event.target.value)} />
                <input
                  placeholder="Requested fields (comma separated)"
                  value={requestedFields}
                  onChange={(event) => setRequestedFields(event.target.value)}
                />
                <button onClick={handleRequestInfo}>Request Info</button>
              </div>
            )}
            {ticket.infoRequests.map((request) => (
              <div key={request.id} style={{ marginTop: '12px' }}>
                <p>
                  <strong>{request.requesterTech.firstName}</strong>: {request.message} ({request.status})
                </p>
                {request.responses.map((response) => (
                  <p key={response.id}>
                    <em>{response.responder.firstName}:</em> {response.message}
                  </p>
                ))}
                <div className="grid">
                  <textarea rows={2} value={responseMessage} onChange={(event) => setResponseMessage(event.target.value)} />
                  <input type="file" onChange={(event) => setResponseFile(event.target.files?.[0] ?? null)} />
                  <button onClick={() => handleRespondInfo(request.id)}>Respond</button>
                </div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="card">
              <h3>Admin Edit</h3>
              <div className="grid">
                <label>
                  Description
                  <textarea rows={3} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
                </label>
                <label>
                  Priority
                  <select value={editPriorityId} onChange={(event) => setEditPriorityId(event.target.value)}>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="action-row">
                  <button onClick={handleAdminUpdate}>Save Changes</button>
                  <button className="danger" onClick={handleAdminDelete}>Delete Ticket</button>
                </div>
                {adminError && <p className="form-error">{adminError}</p>}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="ticket-detail__tab-panel">
          <div className="card">
            <h3>History</h3>
            <div className="grid" style={{ marginBottom: '12px' }}>
              <textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} />
              <button onClick={handleComment}>Add Comment</button>
            </div>
            <ul>
              {ticket.history.map((history) => (
                <li key={history.id}>
                  {history.createdAt}: {history.eventType} - {history.message ?? ''} by {history.actor.firstName}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="ticket-detail__tab-panel">
          <div className="card">
            <h3>Attachments</h3>
            <input type="file" onChange={handleUpload} />
            <ul>
              {ticket.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <button className="secondary" onClick={() => handleDownload(attachment.id, attachment.originalName)}>
                    Download {attachment.originalName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
