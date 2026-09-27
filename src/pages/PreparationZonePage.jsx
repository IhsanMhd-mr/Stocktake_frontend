import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { preparationApi } from '../api/preparation.api.js';
import { EmptyState, ErrorState, LoadingState, RefreshButton } from '../components/common.jsx';
import { PreparationUnitCard, UnitForm, ZoneForm } from '../components/preparation.jsx';
import { useRefreshableData } from '../hooks/useRefreshableData.js';

async function loadZone(zoneId) {
  const [zone, units] = await Promise.all([preparationApi.getZone(zoneId), preparationApi.listUnits(zoneId)]);
  return { zone, units: await Promise.all(units.map(async (unit) => ({ ...unit, preparation: await preparationApi.getPreparation(unit.id) }))) };
}

export function PreparationZonePage() {
  const { zoneId } = useParams();
  const view = useRefreshableData(() => loadZone(zoneId), [zoneId]);
  const [form, setForm] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState(null);
  const zone = view.data?.zone;

  const mutate = async (work) => {
    setSaving(true); setMutationError(null);
    try { await work(); setForm(null); setEditingUnit(null); await view.refresh(); }
    catch (error) { setMutationError(error); if (error.code === 'STALE_VERSION') { setForm(null); setEditingUnit(null); await view.refresh().catch(() => {}); } }
    finally { setSaving(false); }
  };
  return <>
    <Link className="back-link" to="/preparation">← Prepare Store</Link>
    <div className="page-heading minimal-heading"><div><h1>{zone?.name || 'Zone'}</h1><span>{zone?.code}</span></div><RefreshButton onClick={() => view.refresh().catch(() => {})} refreshing={view.refreshing} /></div>
    {zone && <div className="toolbar"><button className="button button-primary" onClick={() => { setEditingUnit(null); setForm('unit'); }}>+ Add Rack or Basket</button><button className="button button-secondary" onClick={() => setForm('zone')}>Edit Zone</button></div>}
    {mutationError && <div className="alert alert-error">{mutationError.message}</div>}
    {form === 'zone' && <section className="card form-panel"><ZoneForm zone={zone} saving={saving} onCancel={() => setForm(null)} onSave={(payload) => mutate(() => preparationApi.updateZone(zone.id, payload))} /></section>}
    {form === 'unit' && <section className="card form-panel"><UnitForm zones={zone ? [zone] : []} initialZoneId={zoneId} unit={editingUnit} saving={saving} onCancel={() => { setForm(null); setEditingUnit(null); }} onSave={({ zoneId: selectedZoneId, data }) => mutate(() => editingUnit ? preparationApi.updateUnit(editingUnit.id, data) : preparationApi.createUnit(selectedZoneId, data))} /></section>}
    {view.loading && <LoadingState />}
    {view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}
    {view.error && view.data && <div className="alert alert-warning">Refresh failed. Showing the last successful Zone snapshot.</div>}
    {view.data && !view.data.units.length && <EmptyState title="No Racks or Baskets." />}
    <div className="management-unit-grid">{view.data?.units.map((unit) => <PreparationUnitCard key={unit.id} unit={unit} onEdit={(selected) => { setEditingUnit(selected); setForm('unit'); }} />)}</div>
  </>;
}
