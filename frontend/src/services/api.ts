const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

function buildAuthHeaders(existing?: HeadersInit, hasJsonBody?: boolean) {
  const token = localStorage.getItem('token');
  const headers = new Headers(existing ?? {});
  if (hasJsonBody) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hasJsonBody = typeof options.body === 'string';
  const headers = buildAuthHeaders(options.headers, hasJsonBody);
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    ...options,
    headers
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(errorBody.message ?? 'Request failed.');
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers = buildAuthHeaders();
  const response = await fetch(`${apiBase}${path}`, { method: 'POST', headers, body: formData, credentials: 'include' });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Upload failed.' }));
    throw new Error(errorBody.message ?? 'Upload failed.');
  }
  return response.json();
}

export async function apiFetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const hasJsonBody = typeof options.body === 'string';
  const headers = buildAuthHeaders(options.headers, hasJsonBody);
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    ...options,
    headers
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(errorBody.message ?? 'Request failed.');
  }
  return response.blob();
}

export type CreateUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  userTypeId: number;
};

export type UpdateUserPayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  userTypeId?: number;
  isActive?: boolean;
};

export type TicketTypePayload = { name: string; description: string; defaultPriorityId: number };
export type PriorityPayload = { name: string; color: string };
export type StatusPayload = { name: string; sortOrder: number };

export const getUsers = () => apiFetch('/api/users');
export const getUserTypes = () => apiFetch('/api/catalog/user-types');
export const createUser = (payload: CreateUserPayload) => apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) });
export const updateUser = (id: number, payload: UpdateUserPayload) =>
  apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteUser = (id: number) => apiFetch(`/api/users/${id}`, { method: 'DELETE' });

export const getTicketTypes = () => apiFetch('/api/catalog/ticket-types');
export const createTicketType = (payload: TicketTypePayload) =>
  apiFetch('/api/catalog/ticket-types', { method: 'POST', body: JSON.stringify(payload) });
export const updateTicketType = (id: number, payload: Partial<TicketTypePayload>) =>
  apiFetch(`/api/catalog/ticket-types/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteTicketType = (id: number) => apiFetch(`/api/catalog/ticket-types/${id}`, { method: 'DELETE' });

export const getPriorities = () => apiFetch('/api/catalog/priorities');
export const createPriority = (payload: PriorityPayload) =>
  apiFetch('/api/catalog/priorities', { method: 'POST', body: JSON.stringify(payload) });
export const updatePriority = (id: number, payload: Partial<PriorityPayload>) =>
  apiFetch(`/api/catalog/priorities/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deletePriority = (id: number) => apiFetch(`/api/catalog/priorities/${id}`, { method: 'DELETE' });

export const getStatuses = () => apiFetch('/api/catalog/statuses');
export const createStatus = (payload: StatusPayload) =>
  apiFetch('/api/catalog/statuses', { method: 'POST', body: JSON.stringify(payload) });
export const updateStatus = (id: number, payload: Partial<StatusPayload>) =>
  apiFetch(`/api/catalog/statuses/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteStatus = (id: number) => apiFetch(`/api/catalog/statuses/${id}`, { method: 'DELETE' });
