import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { ticketPriorityLabel, ticketStatusLabel } from '../constants/ticketLabels';

type Ticket = {
  id: number;
  code?: string | null;
  title: string;
  updatedAt: string;
  createdAt: string;
  status: { code: string; label?: string | null };
  priority: { code: string; label?: string | null };
  assignedTo?: { firstName: string; lastName: string } | null;
};

export function RecentTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const formatTicketDisplayName = (ticket: Ticket) => (ticket.code ? `${ticket.code} - ${ticket.title}` : ticket.title);

  useEffect(() => {
    apiFetch<Ticket[]>('/api/tickets/recent?hours=48')
      .then(setTickets)
      .catch(() => setTickets([]));
  }, []);

  return (
    <div className="page">
      <h2>Recent Tickets</h2>
      <p className="page__subtitle">Tickets created or updated by you in the last 48 hours.</p>
      <div className="card">
        {tickets.length === 0 ? (
          <p>No recent tickets found.</p>
        ) : (
          <ul className="list">
            {tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="list__item list__item--link"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <div>
                  <strong>{formatTicketDisplayName(ticket)}</strong>
                  <div className="list__meta">Status: {ticketStatusLabel(ticket.status.label ?? ticket.status.code)} • Priority: {ticketPriorityLabel(ticket.priority.label ?? ticket.priority.code)}</div>
                  <div className="list__meta">
                    Updated {new Date(ticket.updatedAt).toLocaleString()} • Created {new Date(ticket.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className="list__meta">
                  {ticket.assignedTo ? `Assigned to ${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
