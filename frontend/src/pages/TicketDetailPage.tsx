import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Paperclip } from 'lucide-react';
import { apiFetch, apiFetchBlob, apiUpload } from '../services/api';
import { useAuth } from '../components/AuthProvider';

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
  const [infoMessage, setInfoMessage] = useState('');
  const [requestedFields, setRequestedFields] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [editPriorityId, setEditPriorityId] = useState('');
  const [adminError, setAdminError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'attachments'>('details');
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const canEditStatus = user?.role === 'ADMIN' || user?.role === 'TECH';

  const loadTicket = () => {
    apiFetch<Ticket>(`/api/tickets/${id}`)
      .then((data) => {
        setTicket(data);
        setEditDescription(data.description ?? '');
        setEditPriorityId(data.priority?.id ?? '');
      })
      .catch(() => setTicket(null));
  };

  useEffect(() => {
    loadTicket();
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

  const handleAssign = async (assigneeId: string) => {
    if (!id || !assigneeId) return;
    await apiFetch(`/api/tickets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId })
    });
    setAssigneePopoverOpen(false);
    loadTicket();
  };

  const handleStatusChange = async (statusId: string) => {
    if (!id || !statusId) return;
    await apiFetch(`/api/tickets/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ statusId })
    });
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

  if (!ticket) {
    return <div className="page">Ticket not found.</div>;
  }

  const assigneeInitials = ticket.assignedTo
    ? `${ticket.assignedTo.firstName?.[0] ?? ''}${ticket.assignedTo.lastName?.[0] ?? ''}`.toUpperCase()
    : 'NA';
  const ticketTypeName = ticket.ticketType?.name ?? 'Unknown';
  const priorityName = ticket.priority?.name ?? 'Unknown';
  const attachments = ticket.attachments ?? [];
  const infoRequests = ticket.infoRequests ?? [];
  const historyItems = ticket.history ?? [];
  const filteredAssignees = useMemo(() => {
    if (!assigneeSearch) return assignees;
    const query = assigneeSearch.toLowerCase();
    return assignees.filter((assignee) => `${assignee.firstName} ${assignee.lastName}`.toLowerCase().includes(query));
  }, [assignees, assigneeSearch]);
  const statusName = ticket.status?.name ?? 'Unknown';
  const statusClassName = statusName.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="page">
      <div className="ticket-detail">
        <div className="ticket-detail__header">
          <div className="ticket-detail__title">
            <h1>{ticket.title}</h1>
            <div className="ticket-detail__assignee">
              <span className="ticket-detail__label">Assigned to</span>
              {isAdmin ? (
                <div className="ticket-detail__assignee-popover">
                  <button
                    type="button"
                    className="ticket-detail__assignee-trigger"
                    onClick={() => setAssigneePopoverOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={assigneePopoverOpen}
                  >
                    <span className="ticket-detail__avatar">{assigneeInitials}</span>
                    <span>
                      {ticket.assignedTo
                        ? `${ticket.assignedTo.firstName ?? ''} ${ticket.assignedTo.lastName ?? ''}`.trim()
                        : 'Unassigned'}
                    </span>
                  </button>
                  {assigneePopoverOpen && (
                    <div className="ticket-detail__assignee-menu" role="dialog">
                      <input
                        className="ticket-detail__assignee-search"
                        placeholder="Search technicians"
                        value={assigneeSearch}
                        onChange={(event) => setAssigneeSearch(event.target.value)}
                      />
                      <ul className="ticket-detail__assignee-list" role="listbox">
                        {filteredAssignees.map((assignee) => (
                          <li key={assignee.id}>
                            <button
                              type="button"
                              className="ticket-detail__assignee-option"
                              onClick={() => handleAssign(assignee.id)}
                            >
                              {assignee.firstName} {assignee.lastName}
                            </button>
                          </li>
                        ))}
                        {!filteredAssignees.length && <li className="ticket-detail__assignee-empty">No matches</li>}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ticket-detail__assignee-trigger ticket-detail__assignee-trigger--readonly">
                  <span className="ticket-detail__avatar">{assigneeInitials}</span>
                  <span>
                    {ticket.assignedTo
                      ? `${ticket.assignedTo.firstName ?? ''} ${ticket.assignedTo.lastName ?? ''}`.trim()
                      : 'Unassigned'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="ticket-detail__meta">
            <div className="ticket-detail__meta-item">
              <span className="ticket-detail__label">Type</span>
              <span>{ticketTypeName}</span>
            </div>
            <div className="ticket-detail__meta-item">
              <span className="ticket-detail__label">Priority</span>
              <span>{priorityName}</span>
            </div>
            <div className="ticket-detail__meta-item">
              <span className="ticket-detail__label">State</span>
              <div className="ticket-detail__state">
                <span className={`ticket-detail__state-dot ticket-detail__state-dot--${statusClassName}`} />
                {canEditStatus ? (
                  <select
                    className="ticket-detail__state-select"
                    value={ticket.status?.id ?? ''}
                    onChange={(event) => handleStatusChange(event.target.value)}
                  >
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{statusName}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="ticket-detail__tabs" role="tablist">
          <button
            type="button"
            className={`ticket-detail__tab ${activeTab === 'details' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('details')}
            role="tab"
            aria-selected={activeTab === 'details'}
          >
            Details
          </button>
          <button
            type="button"
            className={`ticket-detail__tab ${activeTab === 'history' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('history')}
            role="tab"
            aria-label="History"
            title="History"
            aria-selected={activeTab === 'history'}
          >
            <Clock size={16} />
          </button>
          <button
            type="button"
            className={`ticket-detail__tab ${activeTab === 'attachments' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('attachments')}
            role="tab"
            aria-label="Attachments"
            title="Attachments"
            aria-selected={activeTab === 'attachments'}
          >
            <Paperclip size={16} />
          </button>
        </div>
      </div>

      {activeTab === 'details' && (
        <>
          <div className="card ticket-detail__panel">
            <h3>Description</h3>
            <p>{ticket.description ?? ''}</p>
          </div>

          {isAdmin && (
            <div className="card ticket-detail__panel">
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

          <div className="card ticket-detail__panel">
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
            {infoRequests.map((request) => (
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
        </>
      )}

      {activeTab === 'history' && (
        <div className="card ticket-detail__panel">
          <h3>History</h3>
          <div className="grid" style={{ marginBottom: '12px' }}>
            <textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} />
            <button onClick={handleComment}>Add Comment</button>
          </div>
          <ul>
            {historyItems.map((history) => (
              <li key={history.id}>
                {history.createdAt}: {history.eventType} - {history.message ?? ''} by {history.actor.firstName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="card ticket-detail__panel">
          <h3>Attachments</h3>
          <input type="file" onChange={handleUpload} />
          <ul>
            {attachments.map((attachment) => (
              <li key={attachment.id}>
                <button className="secondary" onClick={() => handleDownload(attachment.id, attachment.originalName)}>
                  Download {attachment.originalName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
