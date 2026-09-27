import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './common.jsx';

export function ZoneForm({ zone, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ code: '', name: '', displayOrder: 0 });
  useEffect(() => setForm({ code: zone?.code || '', name: zone?.name || '', displayOrder: zone?.displayOrder || 0 }), [zone]);
  const submit = (event) => {
    event.preventDefault();
    onSave({ code: form.code.trim(), name: form.name.trim(), displayOrder: Number(form.displayOrder), ...(zone ? { version: zone.version } : {}) });
  };
  return <form className="management-form" onSubmit={submit}><div className="section-heading"><div><p className="eyebrow">Zone</p><h2>{zone ? `Edit ${zone.code}` : 'Create Zone'}</h2></div></div><div className="form-grid"><label>Code<input value={form.code} maxLength="50" required onChange={(e) => setForm({ ...form, code: e.target.value })} /></label><label>Name<input value={form.name} maxLength="150" required onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Display order<input type="number" min="0" step="1" value={form.displayOrder} required onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} /></label></div><div className="form-actions gap"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Zone'}</button></div></form>;
}

export function UnitForm({ zones, unit, initialZoneId, initialType = 'RACK', onSave, onCancel, saving }) {
  const [form, setForm] = useState({ zoneId: '', code: '', name: '', unitType: 'RACK' });
  useEffect(() => setForm({ zoneId: unit?.zoneId || initialZoneId || zones[0]?.id || '', code: unit?.code || '', name: unit?.name || '', unitType: unit?.unitType || initialType }), [unit, initialZoneId, initialType, zones]);
  const submit = (event) => {
    event.preventDefault();
    onSave({ zoneId: form.zoneId, data: { code: form.code.trim(), name: form.name.trim(), unitType: form.unitType, ...(unit ? { version: unit.version } : {}) } });
  };
  return <form className="management-form" onSubmit={submit}><h2>{unit ? `Edit ${unit.code}` : `Add ${form.unitType === 'RACK' ? 'Rack' : 'Basket'}`}</h2><div className="form-grid"><label>Zone<select value={form.zoneId} disabled={Boolean(unit)} required onChange={(e) => setForm({ ...form, zoneId: e.target.value })}><option value="">Choose</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label><label>Code<input value={form.code} maxLength="50" required onChange={(e) => setForm({ ...form, code: e.target.value })} /></label><label>Name<input value={form.name} maxLength="150" required onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>{unit && <label>Type<select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}><option value="RACK">Rack</option><option value="BASKET">Basket</option></select></label>}</div><div className="form-actions gap"><button type="button" className="button button-secondary" onClick={onCancel}>Back</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button></div></form>;
}

export function PreparationUnitCard({ unit, onEdit }) {
  const summary = unit.preparation?.summary || {};
  return <article className="unit-management-card"><div className="card-title-row"><div><p className="eyebrow">{unit.code} · {unit.unitType}</p><h3>{unit.name}</h3></div><StatusBadge value={unit.status} /></div><div className="structure-numbers">{unit.unitType === 'RACK' && <><span><strong>{summary.sideCount || 0}</strong> Sides</span><span><strong>{summary.bayCount || 0}</strong> Bays</span><span><strong>{summary.shelfCount || 0}</strong> Shelves</span></>}<span><strong>{summary.binCount || 0}</strong> Bins</span></div>{unit.status === 'PREPARATION' && unit.unitType === 'RACK' && !summary.sideCount && <p className="guidance-copy">No structure yet. Quick Setup will guide you.</p>}<div className="card-actions"><Link className="button button-primary" to={`/preparation/units/${unit.id}`}>{unit.status === 'PREPARATION' ? 'Continue Setup' : 'View Structure'}</Link>{unit.status === 'PREPARATION' && <button className="button button-secondary" type="button" onClick={() => onEdit(unit)}>Edit Details</button>}</div></article>;
}
