import { apiRequest } from './api-client.js';

export const teamAssignmentApi = {
  list: async () => (await apiRequest('/team-assignment-process')).assignedUnits,
  get: (id) => apiRequest(`/team-assignment-process/${id}`),
  create: (payload) => apiRequest('/team-assignment-process', { method: 'POST', body: payload, headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  deleteDraft: (id, version) => apiRequest(`/team-assignment-process/${id}`, { method: 'DELETE', body: { version } }),
  replaceBins: (id, payload) => apiRequest(`/team-assignment-process/${id}/bins`, { method: 'PUT', body: payload }),
  activate: (id, version) => apiRequest(`/team-assignment-process/${id}/activate`, { method: 'POST', body: { version }, headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  assignLeader: (id, leaderUserId, version) => apiRequest(`/team-assignment-process/${id}/leader`, { method: 'POST', body: { leaderUserId, version }, headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  reassignLeader: (id, leaderUserId, version) => apiRequest(`/team-assignment-process/${id}/leader`, { method: 'PUT', body: { leaderUserId, version }, headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  unassignLeader: (id, version) => apiRequest(`/team-assignment-process/${id}/leader`, { method: 'DELETE', body: { version } }),
  eligibleLeaders: async () => (await apiRequest('/users/eligible-leaders')).users,
  updateStatus: (id, payload) => apiRequest(`/team-assignment-process/${id}/status`, { method: 'PATCH', body: payload })
};
