import { apiRequest } from './api-client.js';

const mutationKey = () => ({ 'Idempotency-Key': crypto.randomUUID() });

export const preparationApi = {
  listZones: async () => (await apiRequest('/zones')).zones,
  getZone: (id) => apiRequest(`/zones/${id}`),
  createZone: (payload) => apiRequest('/zones', { method: 'POST', body: payload }),
  updateZone: (id, payload) => apiRequest(`/zones/${id}`, { method: 'PATCH', body: payload }),

  listUnits: async (zoneId) => (await apiRequest(`/zones/${zoneId}/units`)).units,
  getUnit: (id) => apiRequest(`/units/${id}`),
  createUnit: (zoneId, payload) => apiRequest(`/zones/${zoneId}/units`, { method: 'POST', body: payload, headers: mutationKey() }),
  updateUnit: (id, payload) => apiRequest(`/units/${id}`, { method: 'PATCH', body: payload }),
  getPreparation: (unitId) => apiRequest(`/units/${unitId}/preparation`),
  getOverview: () => apiRequest('/overview'),
  finalizeUnit: (unitId) => apiRequest(`/units/${unitId}/finalize`, { method: 'POST', body: {}, headers: mutationKey() }),

  createSide: (unitId, payload) => apiRequest(`/units/${unitId}/sides`, { method: 'POST', body: payload }),
  updateSide: (id, payload) => apiRequest(`/sides/${id}`, { method: 'PATCH', body: payload }),
  deleteSide: (id) => apiRequest(`/sides/${id}`, { method: 'DELETE' }),
  generateSideBins: (sideId, count) => apiRequest(`/sides/${sideId}/bins/generate`, { method: 'POST', body: { count }, headers: mutationKey() }),
  generateBasketBins: (unitId, count) => apiRequest(`/units/${unitId}/bins/generate`, { method: 'POST', body: { count }, headers: mutationKey() }),
  deleteBin: (id) => apiRequest(`/bins/${id}`, { method: 'DELETE' }),

  createBay: (sideId, payload) => apiRequest(`/sides/${sideId}/bays`, { method: 'POST', body: payload }),
  updateBay: (id, payload) => apiRequest(`/bays/${id}`, { method: 'PATCH', body: payload }),
  deleteBay: (id) => apiRequest(`/bays/${id}`, { method: 'DELETE' }),

  createShelf: (sideId, payload) => apiRequest(`/sides/${sideId}/shelves`, { method: 'POST', body: payload }),
  updateShelf: (id, payload) => apiRequest(`/shelves/${id}`, { method: 'PATCH', body: payload }),
  deleteShelf: (id) => apiRequest(`/shelves/${id}`, { method: 'DELETE' }),
  assignShelfBins: (id, binIds) => apiRequest(`/shelves/${id}/bins`, { method: 'PUT', body: { binIds }, headers: mutationKey() })
};

export async function loadPreparationOverview() {
  const data = await preparationApi.getOverview();
  return data.zones.map(zone => ({
    ...zone,
    units: data.units
      .filter(u => u.zoneId === zone.id)
      .map(u => ({
        ...u,
        preparation: { summary: { binCount: u.binCount, sideCount: u.sideCount } }
      }))
  }));
}
