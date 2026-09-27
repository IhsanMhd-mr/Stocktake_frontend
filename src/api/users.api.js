import { apiRequest } from './api-client.js';

const mutationHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() });

export const usersApi = {
  list: async () => (await apiRequest('/users')).users,
  create: (payload) => apiRequest('/users', { method: 'POST', body: payload, headers: mutationHeaders() }),
  update: (id, payload) => apiRequest(`/users/${id}`, { method: 'PATCH', body: payload })
};
