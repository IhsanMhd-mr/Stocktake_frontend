import { useState } from 'react';
import { Link } from 'react-router-dom';
import { preparationApi, loadPreparationOverview } from '../api/preparation.api.js';
import { EmptyState, ErrorState, LoadingState } from '../components/common.jsx';
import { PreparationUnitCard, UnitForm, ZoneForm } from '../components/preparation.jsx';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js';
import { useRefreshableData } from '../hooks/useRefreshableData.js';
import { useRealtime } from '../realtime/RealtimeContext.js';

function ConfirmAction({ label, message, onConfirm, disabled = false, primary = false }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button type="button" className={`button ${primary ? 'button-primary' : 'button-secondary'}`} disabled={disabled} onClick={() => setConfirming(true)}>{label}</button>;
  return <div className="inline-confirm" style={{display:'flex',gap:'0.5rem',justifyContent:'center',alignItems:'center'}}><span>{message}</span><button type="button" className="button button-secondary" onClick={() => setConfirming(false)}>Cancel</button><button type="button" className="button button-primary" onClick={() => { setConfirming(false); onConfirm(); }}>Confirm</button></div>;
}

const PREPARATION_ENTITIES = new Set(['ZONE', 'UNIT', 'SIDE', 'BIN', 'BAY', 'SHELF', 'SHELF_BIN']);

export function PreparationPage() {
  const view = useRefreshableData(loadPreparationOverview, []);
  const { lastEvent } = useRealtime();
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [mutationError, setMutationError] = useState(null);
  const [newUnitType, setNewUnitType] = useState('RACK');
  useRealtimeRefresh(lastEvent, (event) => PREPARATION_ENTITIES.has(event.entityType), view.refresh, 300);

  const zones = view.data || [];
  const allUnits = zones.flatMap(z => z.units);
  const pendingUnits = allUnits.filter(u => u.status === 'PREPARATION');

  const finalizePhase = async () => {
    setFinalizing(true);
    setMutationError(null);
    try {
      await Promise.all(pendingUnits.map(u => preparationApi.finalizeUnit(u.id)));
      await view.refresh();
    } catch (error) {
      setMutationError(error);
    } finally {
      setFinalizing(false);
    }
  };

  const saveZone = async (payload) => {
    setSaving(true); setMutationError(null);
    try {
      if (editing) await preparationApi.updateZone(editing.id, payload); else await preparationApi.createZone(payload);
      setForm(null); setEditing(null); await view.refresh();
    } catch (error) { setMutationError(error); if (error.code === 'STALE_VERSION') { setForm(null); setEditing(null); await view.refresh().catch(() => {}); } } finally { setSaving(false); }
  };
  const saveUnit = async ({ zoneId, data }) => {
    setSaving(true); setMutationError(null);
    try {
      if (editing) await preparationApi.updateUnit(editing.id, data); else await preparationApi.createUnit(zoneId, data);
      setForm(null); setEditing(null); await view.refresh();
    } catch (error) { setMutationError(error); if (error.code === 'STALE_VERSION') { setForm(null); setEditing(null); await view.refresh().catch(() => {}); } } finally { setSaving(false); }
  };
  const openEditZone = (zone) => { setEditing(zone); setForm('zone'); setMutationError(null); };
  const openEditUnit = (unit) => { setEditing(unit); setForm('unit'); setMutationError(null); };
  const cancel = () => { setForm(null); setEditing(null); setMutationError(null); };

  return <>
    <div className="page-heading minimal-heading"><h1>Prepare</h1></div>
    <div className="toolbar"><button className="button button-secondary" onClick={() => { setEditing(null); setForm('zone'); }}>Add Zone</button><button className="button button-primary" disabled={!zones.length} onClick={() => { setEditing(null); setNewUnitType('RACK'); setForm('unit'); }}>Add Rack</button><button className="button button-secondary" disabled={!zones.length} onClick={() => { setEditing(null); setNewUnitType('BASKET'); setForm('unit'); }}>Add Basket</button></div>
    {mutationError && <div className="alert alert-error" role="alert">{mutationError.message}</div>}
    {form === 'zone' && <section className="card form-panel"><ZoneForm zone={editing} onSave={saveZone} onCancel={cancel} saving={saving} /></section>}
    {form === 'unit' && <section className="card form-panel"><UnitForm zones={zones} unit={editing} initialType={newUnitType} onSave={saveUnit} onCancel={cancel} saving={saving} /></section>}
    {view.loading && <LoadingState label="Loading Preparation…" />}
    {view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}
    {view.error && view.data && <div className="alert alert-warning">Refresh failed. Showing the last successful Preparation snapshot.</div>}
    {view.data && !zones.length && <EmptyState title="No Zones available">Create a Zone to begin preparing physical Units.</EmptyState>}
    <div className="preparation-zones">{zones.map((zone) => (
      <section className="card zone-management" key={zone.id}>
        <div className="zone-management-heading">
          <div>
            <h2>{zone.name}</h2>
          </div>
          <div className="card-actions">
            <Link className="button button-primary" to={`/preparation/zones/${zone.id}`}>Open</Link>
            <button className="button button-secondary" onClick={() => openEditZone(zone)}>Edit</button>
          </div>
        </div>
        <div className="management-unit-grid">
          {zone.units.map((unit) => <PreparationUnitCard key={unit.id} unit={unit} onEdit={openEditUnit} />)}
        </div>
        {!zone.units.length && <p className="muted">No physical Units in this Zone.</p>}
      </section>
    ))}</div>

    {zones.length > 0 && (
      <section className="card finalize-section" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <h2>Ready to start?</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '1.5rem 0', fontSize: '1.25rem' }}>
          <div><strong>{zones.length}</strong> Zones</div>
          <div><strong>{allUnits.filter(u => u.unitType === 'RACK').length}</strong> Racks</div>
          <div><strong>{allUnits.filter(u => u.unitType === 'BASKET').length}</strong> Baskets</div>
          <div><strong>{allUnits.reduce((acc, u) => acc + (u.preparation?.summary?.binCount || u.binCount || 0), 0)}</strong> Bins</div>
        </div>
        
        {pendingUnits.length > 0 ? (
          <ConfirmAction 
            label="Lock & Start Stock Take" 
            message="Freeze preparation and begin Stock Take?" 
            onConfirm={finalizePhase} 
            primary={true} 
            disabled={finalizing} 
          />
        ) : (
          <strong className="done-state" style={{fontSize: '1.2rem', color: '#10b981'}}>✓ Stock Take Started</strong>
        )}
      </section>
    )}
  </>;
}
