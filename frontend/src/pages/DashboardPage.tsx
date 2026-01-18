import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

type Ticket = {
  id: string;
  title: string;
  status: { name: string };
  priority: { name: string };
  ticketType: { name: string };
  createdAt: string;
};

export function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    apiFetch<Ticket[]>('/api/tickets')
      .then(setTickets)
      .catch(() => setTickets([]));
  }, []);

  const total = tickets.length;
  const open = tickets.filter((ticket) => ticket.status.name !== 'Resuelto' && ticket.status.name !== 'Cerrado').length;

  return (
    <div className="container">
      <h2>Dashboard</h2>
      <div className="grid grid-2">
        <div className="card">
          <h3>Total tickets</h3>
          <p>{total}</p>
        </div>
        <div className="card">
          <h3>Open tickets</h3>
          <p>{open}</p>
        </div>
      </div>
      <div className="card" style={{ marginTop: '16px' }}>
        <h3>Recent tickets</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {tickets.slice(0, 5).map((ticket) => (
              <tr key={ticket.id}>
                <td>{ticket.title}</td>
                <td>{ticket.status.name}</td>
                <td>{ticket.priority.name}</td>
                <td>{ticket.ticketType.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
