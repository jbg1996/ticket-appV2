import { useEffect, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch, apiUpload } from '../services/api';
import { useAuth } from '../components/AuthProvider';

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: { id: string; name: string };
  priority: { id: string; name: string };
  ticketType: { name: string };
  assignee?: { firstName: string; lastName: string } | null;
  attachments: { id: string; originalName: string }[];
  history: { id: string; eventType: string; message?: string; createdAt: string; actor: { firstName: string; lastName: string } }[];
  infoRequests: { id: string; message: string; status: string; requesterTech: { firstName: string; lastName: string }; responses: { id: string; message: string; responder: { firstName: string; lastName: string } }[] }[];
};

type Status = { id: string; name: string };
type User = { id: string; firstName: string; lastName: string; isActive: boolean; userType: { name: string } };

export function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [requestedFields, setRequestedFields] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const loadTicket = () => {
    apiFetch<Ticket>(`/api/tickets/${id}`)
      .then(setTicket)
      .catch(() => setTicket(null));
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    apiFetch<Status[]>('/api/catalog/statuses').then(setStatuses);
    if (user?.role === 'ADMIN') {
      apiFetch<User[]>('/api/users').then((users) =>
        setAssignees(users.filter((candidate) => candidate.isActive && candidate.userType.name === 'Técnico'))
      );
    }
  }, [user]);

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
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBase}/api/attachments/${attachmentId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (!response.ok) return;
    const blob = await response.blob();
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

  const handleAssign = async () => {
    if (!id || !assigneeId) return;
    await apiFetch(`/api/tickets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId })
    });
    setAssigneeId('');
    loadTicket();
  };

  const handleStatusChange = async () => {
    if (!id || !selectedStatusId) return;
    await apiFetch(`/api/tickets/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ statusId: selectedStatusId })
    });
    setSelectedStatusId('');
    loadTicket();
  };

  if (!ticket) {
    return <div className="page">Ticket not found.</div>;
  }

  return (
    <div className="page">
      <h2>{ticket.title}</h2>
      <p>{ticket.description}</p>
      <div className="action-row">
        <span className="badge">{ticket.status.name}</span>
        <span className="badge">{ticket.priority.name}</span>
        <span className="badge">{ticket.ticketType.name}</span>
        <span className="badge">Assignee: {ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : 'Unassigned'}</span>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
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

      <div className="card" style={{ marginTop: '16px' }}>
        <h3>Actions</h3>
        <div className="grid">
          {(user?.role === 'ADMIN' || user?.role === 'TECH') && (
            <>
              <label>
                Change Status
                <select value={selectedStatusId} onChange={(event) => setSelectedStatusId(event.target.value)}>
                  <option value="">Select status</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={handleStatusChange}>Update Status</button>
            </>
          )}
          {user?.role === 'ADMIN' && (
            <>
              <label>
                Assign to Tech
                <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                  <option value="">Select user</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.firstName} {assignee.lastName} ({assignee.userType.name})
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={handleAssign}>Assign</button>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
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

      <div className="card" style={{ marginTop: '16px' }}>
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
    </div>
  );
}
