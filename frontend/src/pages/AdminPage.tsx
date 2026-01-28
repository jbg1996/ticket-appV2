import { useEffect, useState } from 'react';
import { apiFetch, apiFetchBlob } from '../services/api';

type User = { id: string; firstName: string; lastName: string; email: string; isActive: boolean; userType: { name: string } };

type Report = { id: string; name: string; createdAt: string };

type Setting = { value: string };

type CatalogItem = { id: string; name: string };

type UserType = { id: string; name: string };

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [headerColor, setHeaderColor] = useState('#1f2937');
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', userTypeId: '' });
  const [ticketTypes, setTicketTypes] = useState<CatalogItem[]>([]);
  const [priorities, setPriorities] = useState<CatalogItem[]>([]);
  const [statuses, setStatuses] = useState<CatalogItem[]>([]);
  const [newStatus, setNewStatus] = useState({ name: '', sortOrder: 1 });
  const [newPriority, setNewPriority] = useState({ name: '', color: '#2563eb' });
  const [newTicketType, setNewTicketType] = useState({ name: '', description: '', defaultPriorityId: '' });

  const loadAll = () => {
    apiFetch<User[]>('/api/users').then(setUsers);
    apiFetch<Report[]>('/api/reports').then(setReports);
    apiFetch<Setting>('/api/settings/header-color').then((data) => setHeaderColor(data.value));
    apiFetch<UserType[]>('/api/catalog/user-types').then(setUserTypes);
    apiFetch<CatalogItem[]>('/api/catalog/ticket-types').then(setTicketTypes);
    apiFetch<CatalogItem[]>('/api/catalog/priorities').then(setPriorities);
    apiFetch<CatalogItem[]>('/api/catalog/statuses').then(setStatuses);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createUser = async () => {
    await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(newUser) });
    setNewUser({ firstName: '', lastName: '', email: '', password: '', userTypeId: '' });
    loadAll();
  };

  const generateReport = async (period: string) => {
    await apiFetch(`/api/reports/generate?period=${period}`, { method: 'POST' });
    loadAll();
  };

  const updateHeader = async () => {
    await apiFetch('/api/settings/header-color', { method: 'PUT', body: JSON.stringify({ value: headerColor }) });
  };

  const createStatus = async () => {
    await apiFetch('/api/catalog/statuses', { method: 'POST', body: JSON.stringify(newStatus) });
    setNewStatus({ name: '', sortOrder: 1 });
    loadAll();
  };

  const createPriority = async () => {
    await apiFetch('/api/catalog/priorities', { method: 'POST', body: JSON.stringify(newPriority) });
    setNewPriority({ name: '', color: '#2563eb' });
    loadAll();
  };

  const createTicketType = async () => {
    await apiFetch('/api/catalog/ticket-types', { method: 'POST', body: JSON.stringify(newTicketType) });
    setNewTicketType({ name: '', description: '', defaultPriorityId: '' });
    loadAll();
  };

  const handleDownloadReport = async (report: Report) => {
    const blob = await apiFetchBlob(`/api/reports/${report.id}/download`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.name;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <h2>Admin</h2>

      <div className="card">
        <h3>UI Settings</h3>
        <div className="grid">
          <label>
            Header Color
            <input value={headerColor} onChange={(event) => setHeaderColor(event.target.value)} />
          </label>
          <button onClick={updateHeader}>Save Color</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <h3>User Management</h3>
        <div className="grid grid-2">
          <div>
            <h4>Create User</h4>
            <div className="grid">
              <input placeholder="First name" value={newUser.firstName} onChange={(event) => setNewUser({ ...newUser, firstName: event.target.value })} />
              <input placeholder="Last name" value={newUser.lastName} onChange={(event) => setNewUser({ ...newUser, lastName: event.target.value })} />
              <input placeholder="Email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} />
              <input placeholder="Password" type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} />
              <select value={newUser.userTypeId} onChange={(event) => setNewUser({ ...newUser, userTypeId: event.target.value })}>
                <option value="">Select role</option>
                {userTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <button onClick={createUser}>Create</button>
            </div>
          </div>
          <div>
            <h4>Users</h4>
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  {user.firstName} {user.lastName} - {user.email} ({user.userType.name}) {user.isActive ? '' : '(Disabled)'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <h3>Catalogs</h3>
        <div className="grid grid-2">
          <div>
            <h4>Ticket Types</h4>
            <div className="grid">
              <input
                placeholder="Name"
                value={newTicketType.name}
                onChange={(event) => setNewTicketType({ ...newTicketType, name: event.target.value })}
              />
              <textarea
                placeholder="Description"
                value={newTicketType.description}
                onChange={(event) => setNewTicketType({ ...newTicketType, description: event.target.value })}
              />
              <select
                value={newTicketType.defaultPriorityId}
                onChange={(event) => setNewTicketType({ ...newTicketType, defaultPriorityId: event.target.value })}
              >
                <option value="">Default Priority</option>
                {priorities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button onClick={createTicketType}>Add Ticket Type</button>
            </div>
            <ul>{ticketTypes.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
          </div>
          <div>
            <h4>Priorities</h4>
            <div className="grid">
              <input
                placeholder="Name"
                value={newPriority.name}
                onChange={(event) => setNewPriority({ ...newPriority, name: event.target.value })}
              />
              <input
                placeholder="Color"
                value={newPriority.color}
                onChange={(event) => setNewPriority({ ...newPriority, color: event.target.value })}
              />
              <button onClick={createPriority}>Add Priority</button>
            </div>
            <ul>{priorities.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
          </div>
          <div>
            <h4>Statuses</h4>
            <div className="grid">
              <input
                placeholder="Name"
                value={newStatus.name}
                onChange={(event) => setNewStatus({ ...newStatus, name: event.target.value })}
              />
              <input
                placeholder="Sort Order"
                type="number"
                value={newStatus.sortOrder}
                onChange={(event) => setNewStatus({ ...newStatus, sortOrder: Number(event.target.value) })}
              />
              <button onClick={createStatus}>Add Status</button>
            </div>
            <ul>{statuses.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <h3>Reports</h3>
        <div className="action-row">
          <button onClick={() => generateReport('daily')}>Generate Daily</button>
          <button onClick={() => generateReport('weekly')}>Generate Weekly</button>
          <button onClick={() => generateReport('monthly')}>Generate Monthly</button>
        </div>
        <ul>
          {reports.map((report) => (
            <li key={report.id}>
              <button className="button-link" onClick={() => handleDownloadReport(report)}>
                {report.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
