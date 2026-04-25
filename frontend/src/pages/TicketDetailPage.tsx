import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Paperclip, Trash2 } from 'lucide-react';
import { apiFetch, apiFetchBlob, apiUpload } from '../services/api';
import { useAuth } from '../components/AuthProvider';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ticketPriorityLabel, ticketStatusLabel, ticketTypeLabel } from '../constants/ticketLabels';

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: { id: number; name: string; color?: string | null };
  priority: { id: number; name: string };
  ticketType: { name: string };
  assignedTo?: { firstName: string; lastName: string } | null;
  attachments: { id: number; originalName: string }[];
  history: { id: number; eventType: string; message?: string; createdAt: string; actor: { firstName: string; lastName: string } }[];
  infoRequests: { id: number; message: string; status: string; requesterTech: { firstName: string; lastName: string }; responses: { id: number; message: string; responder: { firstName: string; lastName: string } }[] }[];
};

type Status = { id: number; name: string; color?: string | null };

type Priority = { id: number; name: string };

type User = { id: number; firstName: string; lastName: string; isActive: boolean; userType: { name: string; code: string } };

export function TicketDetailPage() {
  const { id } = useParams();
  const ticketId = id ? Number(id) : null;
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editPriorityId, setEditPriorityId] = useState<number | null>(null);
  const [adminError, setAdminError] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  const canAssignTicket = user?.role === 'ADMIN' || user?.role === 'TECH';
  const isAdmin = user?.role === 'ADMIN';
  const canDeleteAttachment = user?.role === 'ADMIN' || user?.role === 'TECH';

  const loadTicket = async () => {
    if (!ticketId || !Number.isInteger(ticketId)) {
      setTicket(null);
      setError('Ticket not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Ticket>(`/api/tickets/${ticketId}`);
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
      if (!ticketId || !Number.isInteger(ticketId)) {
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
        const data = await apiFetch<Ticket>(`/api/tickets/${ticketId}`);
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
  }, [ticketId]);

  useEffect(() => {
    apiFetch<Status[]>('/api/catalog/statuses').then(setStatuses);
    apiFetch<Priority[]>('/api/catalog/priorities').then(setPriorities);
    if (canAssignTicket) {
      apiFetch<User[]>('/api/users/summary').then((users) =>
        setAssignees(users.filter((candidate) => candidate.isActive && candidate.userType.code === 'TECH'))
      );
    }
  }, [canAssignTicket]);

  const filteredAssignees = useMemo(() => {
    const query = assigneeQuery.trim().toLowerCase();
    if (!query) return assignees;
    return assignees.filter((assignee) =>
      `${assignee.firstName} ${assignee.lastName}`.toLowerCase().includes(query)
    );
  }, [assigneeQuery, assignees]);

  const handleRequestInfo = async () => {
    if (!ticketId) return;
    await apiFetch(`/api/tickets/${ticketId}/request-info`, {
      method: 'POST',
      body: JSON.stringify({
        message: infoMessage
      })
    });
    setInfoMessage('');
    loadTicket();
  };

  const handleRespondInfo = async (infoRequestId: number) => {
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
    if (!ticketId || !event.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', event.target.files[0]);
    await apiUpload(`/api/tickets/${ticketId}/attachments`, formData);
    loadTicket();
  };

  const handleDownload = async (attachmentId: number, originalName: string) => {
    const blob = await apiFetchBlob(`/api/attachments/${attachmentId}/download`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteAttachment = async (attachmentId: number, originalName: string) => {
    if (!ticketId) return;
    setAttachmentError('');
    if (!window.confirm(`Delete attachment "${originalName}"? This action cannot be undone.`)) return;
    try {
      await apiFetch(`/api/tickets/${ticketId}/attachments/${attachmentId}`, { method: 'DELETE' });
      setTicket((current) =>
        current ? { ...current, attachments: current.attachments.filter((attachment) => attachment.id !== attachmentId) } : current
      );
    } catch (deleteError) {
      setAttachmentError(deleteError instanceof Error ? deleteError.message : 'Unauthorized');
    }
  };

  const handleComment = async () => {
    if (!ticketId) return;
    await apiFetch(`/api/tickets/${ticketId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ message: comment })
    });
    setComment('');
    loadTicket();
  };

  const handleStatusSelect = async (statusId: number) => {
    setSelectedStatusId(statusId);
    if (!ticketId || !statusId) return;
    await apiFetch(`/api/tickets/${ticketId}/status`, {
      method: 'POST',
      body: JSON.stringify({ statusId })
    });
    setSelectedStatusId(null);
    loadTicket();
  };

  const handleAssignSelect = async (assigneeId: number) => {
    if (!ticketId || !assigneeId) return;
    await apiFetch(`/api/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId })
    });
    setAssigneeOpen(false);
    setAssigneeQuery('');
    loadTicket();
  };

  const handleAdminUpdate = async () => {
    if (!ticketId) return;
    setAdminError('');
    try {
      await apiFetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: editDescription,
          priorityId: editPriorityId ?? undefined
        })
      });
      loadTicket();
    } catch (error) {
      setAdminError('Unauthorized');
    }
  };

  const handleAdminDelete = async () => {
    if (!ticketId) return;
    setAdminError('');
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await apiFetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      window.location.href = '/tickets';
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Unauthorized');
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

  const activeStatus = statuses.find((status) => status.id === (selectedStatusId ?? ticket.status.id)) ?? ticket.status;
  const statusColor = activeStatus.color ?? '#9CA3AF';

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
                <PopoverTrigger className="ticket-detail__assignee" disabled={!canAssignTicket}>
                  <span className="ticket-detail__avatar" aria-hidden="true">
                    {assignedInitials}
                  </span>
                  <span className="ticket-detail__assignee-name">{assignedName}</span>
                  {canAssignTicket && <span className="ticket-detail__assignee-action">Cambiar</span>}
                </PopoverTrigger>
                {canAssignTicket && (
                  <PopoverContent className="ticket-detail__assignee-popover">
                    <input
                      type="text"
                      placeholder="Search technician..."
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
              <span className="ticket-detail__meta-value">{ticketTypeLabel(ticket.ticketType.name)}</span>
            </div>
            <div className="ticket-detail__meta-item">
              <span className="ticket-detail__meta-label">Priority</span>
              <span className="ticket-detail__meta-value">{ticketPriorityLabel(ticket.priority.name)}</span>
            </div>
            <div className="ticket-detail__meta-item">
              <span className="ticket-detail__meta-label">Status</span>
              {(user?.role === 'ADMIN' || user?.role === 'TECH') ? (
                <label className="ticket-detail__state-select">
                  <div className="ticket-detail__state-control">
                    <span className="ticket-detail__state-dot" style={{ backgroundColor: statusColor }} aria-hidden="true" />
                    <select
                      value={selectedStatusId ?? ticket.status.id}
                      onChange={(event) => handleStatusSelect(Number(event.target.value))}
                    >
                      {statuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {ticketStatusLabel(status.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              ) : (
                <div className="ticket-detail__state-readonly">
                  <div className="ticket-detail__state-control">
                    <span className="ticket-detail__state-dot" style={{ backgroundColor: statusColor }} aria-hidden="true" />
                    <span>{ticketStatusLabel(ticket.status.name)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="details" className="ticket-detail__tab-panel">
          <div className="card">
            <h3>Description</h3>
            <p className="ticket-detail__multiline">{ticket.description}</p>
          </div>

          <div className="card">
            <h3>Info Requests</h3>
            {user?.role !== 'REQUESTER' && (
              <div className="grid">
                <textarea rows={2} value={infoMessage} onChange={(event) => setInfoMessage(event.target.value)} />
                <button onClick={handleRequestInfo}>Request Info</button>
              </div>
            )}
            {ticket.infoRequests.map((request) => (
              <div key={request.id} style={{ marginTop: '12px' }}>
                <p>
                  <strong>{request.requesterTech.firstName}</strong>: <span className="ticket-detail__multiline-inline">{request.message}</span> ({request.status})
                </p>
                {request.responses.map((response) => (
                  <p key={response.id}>
                    <em>{response.responder.firstName}:</em> <span className="ticket-detail__multiline-inline">{response.message}</span>
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
                  <select
                    value={editPriorityId ?? ''}
                    onChange={(event) => setEditPriorityId(event.target.value ? Number(event.target.value) : null)}
                  >
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {ticketPriorityLabel(priority.name)}
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
                  {history.createdAt}: {history.eventType} - <span className="ticket-detail__multiline-inline">{history.message ?? ''}</span> by {history.actor.firstName}
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="ticket-detail__tab-panel">
          <div className="card">
            <h3>Attachments</h3>
            <input type="file" onChange={handleUpload} />
            {attachmentError && <p className="form-error">{attachmentError}</p>}
            <ul className="ticket-detail__attachments-list">
              {ticket.attachments.map((attachment) => (
                <li key={attachment.id} className="ticket-detail__attachment-item">
                  <div className="ticket-detail__attachment-actions">
                    <button
                      className="secondary ticket-detail__attachment-button"
                      onClick={() => handleDownload(attachment.id, attachment.originalName)}
                      type="button"
                    >
                      Download {attachment.originalName}
                    </button>
                    {canDeleteAttachment && (
                      <button
                        className="danger ticket-detail__attachment-button ticket-detail__attachment-button--danger"
                        onClick={() => handleDeleteAttachment(attachment.id, attachment.originalName)}
                        type="button"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
