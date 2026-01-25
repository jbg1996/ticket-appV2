import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

type CatalogItem = { id: string; name: string };

export function TablesPage() {
  const [ticketTypes, setTicketTypes] = useState<CatalogItem[]>([]);
  const [priorities, setPriorities] = useState<CatalogItem[]>([]);
  const [statuses, setStatuses] = useState<CatalogItem[]>([]);

  useEffect(() => {
    apiFetch<CatalogItem[]>('/api/catalog/ticket-types').then(setTicketTypes).catch(() => setTicketTypes([]));
    apiFetch<CatalogItem[]>('/api/catalog/priorities').then(setPriorities).catch(() => setPriorities([]));
    apiFetch<CatalogItem[]>('/api/catalog/statuses').then(setStatuses).catch(() => setStatuses([]));
  }, []);

  return (
    <div className="page">
      <h2>Tables</h2>
      <p className="page__subtitle">Maintain ticket catalogs (types, priorities, statuses).</p>
      <div className="grid grid-2">
        <div className="card">
          <h3>Ticket Types</h3>
          <p className="page__subtitle">TODO: Add CRUD controls for ticket types.</p>
          <ul className="list">
            {ticketTypes.map((item) => (
              <li key={item.id} className="list__item">{item.name}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Priorities</h3>
          <p className="page__subtitle">TODO: Add CRUD controls for priorities.</p>
          <ul className="list">
            {priorities.map((item) => (
              <li key={item.id} className="list__item">{item.name}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Statuses</h3>
          <p className="page__subtitle">TODO: Add CRUD controls for statuses.</p>
          <ul className="list">
            {statuses.map((item) => (
              <li key={item.id} className="list__item">{item.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
