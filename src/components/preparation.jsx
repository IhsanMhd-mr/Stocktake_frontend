import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ZoneForm({ zone, onSave, onCancel, saving }) {
  const [name, setName] = useState(zone?.name || '');
  const submit = (event) => {
    event.preventDefault();
    onSave({ name: name.trim(), code: zone?.code || name.trim().toUpperCase().substring(0, 10).replace(/[^A-Z0-9]/g, ''), displayOrder: zone?.displayOrder || 0, ...(zone ? { version: zone.version } : {}) });
  };
  return (
    <form className="management-form" onSubmit={submit}>
      <h2>{zone ? 'Edit Zone' : 'Add Zone'}</h2>
      <div className="form-grid">
        <label>Zone name<input value={name} maxLength="150" required onChange={(e) => setName(e.target.value)} autoFocus /></label>
      </div>
      <div className="form-actions gap">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="button button-primary" disabled={saving}>{zone ? 'Save' : 'Add Zone'}</button>
      </div>
    </form>
  );
}

export function UnitForm({ zones, unit, initialZoneId, initialType = 'RACK', onSave, onCancel, saving }) {
  const [zoneId, setZoneId] = useState(unit?.zoneId || initialZoneId || zones[0]?.id || '');
  const [name, setName] = useState(unit?.name || '');
  const submit = (event) => {
    event.preventDefault();
    onSave({ zoneId, data: { name: name.trim(), code: unit?.code || name.trim().toUpperCase().substring(0, 10).replace(/[^A-Z0-9]/g, ''), unitType: initialType, ...(unit ? { version: unit.version } : {}) } });
  };
  return (
    <form className="management-form" onSubmit={submit}>
      <h2>{unit ? `Edit ${initialType === 'RACK' ? 'Rack' : 'Basket'}` : `Add ${initialType === 'RACK' ? 'Rack' : 'Basket'}`}</h2>
      <div className="form-grid">
        <label>Name<input value={name} maxLength="150" required onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <label>Zone
          <select value={zoneId} disabled={Boolean(unit) || Boolean(initialZoneId)} required onChange={(e) => setZoneId(e.target.value)}>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </label>
      </div>
      <div className="form-actions gap">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="button button-primary" disabled={saving}>{unit ? 'Save' : `Add ${initialType === 'RACK' ? 'Rack' : 'Basket'}`}</button>
      </div>
    </form>
  );
}

export function PreparationUnitCard({ unit, onEdit, onCustomBins }) {
  const summary = unit.preparation?.summary || {};
  const isRack = unit.unitType === 'RACK';
  const designedStatus = isRack 
     ? (summary.sideCount > 0 ? `${summary.sideCount} sides designed` : 'Not designed')
     : (summary.binCount > 0 ? `${summary.binCount} bins added` : 'Not prepared');

  return (
    <article className="unit-management-card compact-unit-card">
      <div className="card-title-row">
        <div>
          <p className="eyebrow">{unit.unitType === 'BASKET' ? 'Basket' : 'Rack'}</p>
          <h3>{unit.name || unit.code}</h3>
        </div>
      </div>
      <p className="simplified-status">{designedStatus}</p>
      <div className="card-actions">
        <Link className="button button-primary" to={`/preparation/units/${unit.id}`}>
          {unit.status === 'PREPARATION' ? 'Design' : 'View'}
        </Link>
        {unit.status === 'PREPARATION' && (
          <button className="button button-secondary" type="button" onClick={() => onEdit(unit)}>Edit Name</button>
        )}
        {unit.status === 'PREPARATION' && isRack && (
          <button className="button button-secondary" type="button" onClick={() => onCustomBins(unit)}>Custom Bins</button>
        )}
      </div>
    </article>
  );
}

export function CustomBinsForm({ unit, onSave, onCancel, saving }) {
  const [position, setPosition] = useState('FRONT');
  const [count, setCount] = useState(10);
  const submit = (event) => {
    event.preventDefault();
    onSave({ position, count: Number(count) });
  };
  return (
    <form className="management-form" onSubmit={submit}>
      <h2>Add Custom Bins</h2>
      <p>Rack<br/><strong>{unit.name || unit.code}</strong></p>
      <div className="form-grid">
        <label>Position
          <select value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="FRONT">FRONT</option>
            <option value="RIGHT">RIGHT</option>
            <option value="BACK">BACK</option>
            <option value="LEFT">LEFT</option>
          </select>
        </label>
        <label>Number of bins
          <input type="number" min="1" max="1000" value={count} required onChange={(e) => setCount(e.target.value)} />
        </label>
      </div>
      <div className="form-actions gap">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="button button-primary" disabled={saving}>Add {count} Bins</button>
      </div>
    </form>
  );
}
