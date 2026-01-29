import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';

type Ticket = {
  id: number;
  title: string;
  updatedAt: string;
  createdAt: string;
  status: { name: string };
  priority: { name: string };
  assignedTo?: { firstName: string; lastName: string } | null;
};

export function RecentTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);

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
                  <strong>{ticket.title}</strong>
                  <div className="list__meta">Status: {ticket.status.name} • Priority: {ticket.priority.name}</div>
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
