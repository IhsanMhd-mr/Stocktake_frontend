import { apiRequest } from './api-client.js';

export const stockTakeApi = {
  getMyAssignedUnits: async () => (await apiRequest('/stock-take/my-assigned-units')).assignedUnits,
  getMyAssignedUnit: (id) => apiRequest(`/stock-take/my-assigned-units/${id}`),
  getUnits: async () => (await apiRequest('/stock-take/units')).units,
  getDashboardCoverage: () => apiRequest('/stock-take/dashboard-coverage'),
  getUnit: (id) => apiRequest(`/stock-take/units/${id}`),
  getBinItems: (id) => apiRequest(`/stock-take/bins/${id}/items`),
  updateBinItems: (id, payload, idempotencyKey) => apiRequest(`/stock-take/bins/${id}/items`, {
    method: 'PUT', body: payload, headers: { 'Idempotency-Key': idempotencyKey }
  }),
  getBinStatus: (id) => apiRequest(`/stock-take/bins/${id}/status`),
  updateBinStatus: (id, payload) => apiRequest(`/stock-take/bins/${id}/status`, { method: 'PATCH', body: payload })
};
