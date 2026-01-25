import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../components/AuthProvider';

type Ticket = {
  id: string;
  title: string;
  updatedAt?: string;
  createdAt?: string;
  createdById?: string;
  createdBy?: { id: string };
};

const HOURS_48 = 48 * 60 * 60 * 1000;

export function RecentTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    apiFetch<Ticket[]>('/api/tickets')
      .then(setTickets)
      .catch(() => setTickets([]));
  }, []);

  const recentTickets = useMemo(() => {
    const cutoff = Date.now() - HOURS_48;
    return tickets.filter((ticket) => {
      const timestamp = ticket.updatedAt ?? ticket.createdAt;
      if (!timestamp) return false;
      const isRecent = new Date(timestamp).getTime() >= cutoff;
      const isUser =
        ticket.createdById === user?.id || ticket.createdBy?.id === user?.id || !user?.id;
      return isRecent && isUser;
    });
  }, [tickets, user?.id]);

  return (
    <div className="page">
      <h2>Recent Tickets</h2>
      <p className="page__subtitle">Tickets created or updated by you in the last 48 hours.</p>
      <div className="card">
        {recentTickets.length === 0 ? (
          <p>No recent tickets found. TODO: Connect backend filter for last 48 hours.</p>
        ) : (
          <ul className="list">
            {recentTickets.map((ticket) => (
              <li key={ticket.id} className="list__item">
                <span>{ticket.title}</span>
                <span className="list__meta">Updated {ticket.updatedAt ?? ticket.createdAt}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
