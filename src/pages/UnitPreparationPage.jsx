import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { preparationApi } from '../api/preparation.api.js';
import { applySideDesign, addCustomBins } from '../services/rack-builder.js';
import { ErrorState, LoadingState, StatusBadge } from '../components/common.jsx';
import { useRefreshableData } from '../hooks/useRefreshableData.js';

function ConfirmAction({ label, message, onConfirm, disabled = false, primary = false }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button type="button" className={`button ${primary ? 'button-primary' : 'button-secondary'}`} disabled={disabled} onClick={() => setConfirming(true)}>{label}</button>;
  return <div className="inline-confirm"><span>{message}</span><button type="button" className="button button-secondary" onClick={() => setConfirming(false)}>Cancel</button><button type="button" className="button button-primary" onClick={() => { setConfirming(false); onConfirm(); }}>Confirm</button></div>;
}

function BasketDesignBlock({ unit, data, onGenerate, saving, mutable }) {
  const [mode, setMode] = useState(data.summary.binCount > 0 ? 'view' : 'design');
  const [count, setCount] = useState(20);

  const handleContinue = (e) => {
    e.preventDefault();
    setMode('confirm');
  };

  const handleSave = async () => {
    await onGenerate(Number(count));
    setMode('view');
  };

  if (mode === 'confirm') {
    return (
      <div className="side-block confirming basket-confirm">
        <h3>Create Basket Bins?</h3>
        <p>{count} Bins</p>
        <div className="form-actions" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="button button-primary" onClick={handleSave} disabled={saving}>
            Create Bins
          </button>
          <button className="button button-secondary" onClick={() => setMode('design')} disabled={saving}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'design') {
    return (
      <div className="side-block editing basket-edit">
        <h3>{unit.name || unit.code}</h3>
        <p>Basket</p>
        <form onSubmit={handleContinue}>
          <label style={{marginTop:'1rem', display:'flex', justifyContent:'space-between', width:'100%'}}>Number of bins
            <input type="number" min="1" value={count} onChange={e => setCount(e.target.value)} required style={{width: '80px', padding: '0.25rem'}}/>
          </label>
          <div className="form-actions gap" style={{ marginTop: '1rem' }}>
            <button type="submit" className="button button-primary" disabled={saving}>Continue</button>
            {data.summary.binCount > 0 && <button type="button" className="button button-secondary" onClick={() => setMode('view')} disabled={saving}>Cancel</button>}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="side-block designed basket-view">
      <h3>{unit.name || unit.code}</h3>
      <p>Basket</p>
      <p>{data.summary.binCount} Bins</p>
      {mutable && <button className="button button-secondary" onClick={() => setMode('design')} disabled={saving}>Update</button>}
    </div>
  );
}

function SideDesignBlock({ sideType, existingSide, onUpdate, onCustom, saving, mutable }) {
  const [mode, setMode] = useState('view');
  
  const existingShelves = existingSide?.standaloneShelves?.length || 0;
  const existingBays = existingSide?.bays?.length || 0;
  const existingShelvesPerBay = existingSide?.bays?.[0]?.shelves?.length || 0;
  const existingBinsPerShelf = existingSide?.bays?.[0]?.shelves?.[0]?.binMappings?.length || existingSide?.standaloneShelves?.[0]?.binMappings?.length || 0;
  
  const existingCustomBins = existingSide?.bins?.filter(b => !b.assignedShelfId)?.length || 0;
  const existingPositionedBins = (existingSide?.bins?.length || 0) - existingCustomBins;
  const hasStructure = existingShelves > 0 || existingBays > 0;

  const [arrangement, setArrangement] = useState(hasStructure ? (existingBays > 0 ? 'BAYS' : 'SHELVES') : 'CUSTOM');
  const [bays, setBays] = useState(existingBays || 3);
  const [shelvesPerBay, setShelvesPerBay] = useState(existingShelvesPerBay || 6);
  const [shelves, setShelves] = useState(existingShelves || 3);
  const [binsPerShelf, setBinsPerShelf] = useState(existingBinsPerShelf || 6);
  const [customBinsCount, setCustomBinsCount] = useState(existingCustomBins || 10);

  const totalBins = arrangement === 'BAYS' ? (bays * shelvesPerBay * binsPerShelf) : (shelves * binsPerShelf);

  const handleContinue = (e) => {
    e.preventDefault();
    setMode('confirm');
  };

  const handleSave = async () => {
    if (arrangement === 'CUSTOM') {
      await onCustom({ sideType, count: customBinsCount });
    } else {
      await onUpdate({ sideType, displayOrder: ['FRONT', 'RIGHT', 'BACK', 'LEFT'].indexOf(sideType), arrangement, bays, shelvesPerBay, shelves, binsPerShelf });
    }
    setMode('view');
  };

  if (mode === 'confirm') {
    if (arrangement === 'CUSTOM') {
      return (
        <div className="side-block confirming">
          <h3>Create Custom Bins?</h3>
          <p>{sideType}</p>
          <p>{customBinsCount} Bins</p>
          <div className="form-actions" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="button button-primary" onClick={handleSave} disabled={saving}>
              Create {customBinsCount} Bins
            </button>
            <button className="button button-secondary" onClick={() => setMode('design')} disabled={saving}>
              Back
            </button>
          </div>
        </div>
      );
    }
    
    const isUpdate = hasStructure;
    const actionText = isUpdate ? `Update ${sideType}` : `Create ${sideType}`;
    
    return (
      <div className="side-block confirming">
        <h3>{actionText}?</h3>
        {arrangement === 'BAYS' ? (
          <p>{bays} Bays</p>
        ) : (
          <p>{shelves} Shelves</p>
        )}
        <p>{totalBins} Bins</p>
        <div className="form-actions" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="button button-primary" onClick={handleSave} disabled={saving}>
            {actionText}
          </button>
          <button className="button button-secondary" onClick={() => setMode('design')} disabled={saving}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'design') {
    return (
      <div className="side-block editing">
        <h3>{sideType}</h3>
        <form onSubmit={handleContinue}>
          <div className="arrangement-toggle" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem'}}>
             <span style={{fontSize: '0.875rem', fontWeight: 500, color: '#64748b'}}>What do you want to add?</span>
             <label><input type="radio" checked={arrangement === 'SHELVES'} onChange={() => setArrangement('SHELVES')} /> Shelves</label>
             <label><input type="radio" checked={arrangement === 'BAYS'} onChange={() => setArrangement('BAYS')} /> Bays</label>
             <label><input type="radio" checked={arrangement === 'CUSTOM'} onChange={() => setArrangement('CUSTOM')} /> Custom</label>
          </div>
          
          {arrangement === 'SHELVES' && (
            <>
              <label>Shelves<input type="number" min="1" value={shelves} onChange={e => setShelves(Number(e.target.value))} required /></label>
              <label>Bins per Shelf<input type="number" min="1" value={binsPerShelf} onChange={e => setBinsPerShelf(Number(e.target.value))} required /></label>
              <div style={{ marginTop: '1rem', fontWeight: 500 }}>
                Total<br/>
                {totalBins} Bins
              </div>
            </>
          )}

          {arrangement === 'BAYS' && (
            <>
              <label>Bays<input type="number" min="1" value={bays} onChange={e => setBays(Number(e.target.value))} required /></label>
              <label>Shelves per Bay<input type="number" min="1" value={shelvesPerBay} onChange={e => setShelvesPerBay(Number(e.target.value))} required /></label>
              <label>Bins per Shelf<input type="number" min="1" value={binsPerShelf} onChange={e => setBinsPerShelf(Number(e.target.value))} required /></label>
              <div style={{ marginTop: '1rem', fontWeight: 500 }}>
                Total<br/>
                {totalBins} Bins
              </div>
            </>
          )}
          
          {arrangement === 'CUSTOM' && (
            <>
              <label>Number of bins<input type="number" min="1" value={customBinsCount} onChange={e => setCustomBinsCount(Number(e.target.value))} required /></label>
            </>
          )}

          <div className="form-actions gap" style={{ marginTop: '1rem' }}>
            <button type="submit" className="button button-primary" disabled={saving}>Continue</button>
            <button type="button" className="button button-secondary" onClick={() => setMode('view')} disabled={saving}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  if (!existingSide) {
    return (
      <div className="side-block not-set">
        <h3>{sideType}</h3>
        <p>Not set up</p>
        {mutable && <button className="button button-secondary" onClick={() => setMode('design')} disabled={saving}>Design</button>}
      </div>
    );
  }

  return (
    <div className="side-block designed">
      <h3>{sideType}</h3>
      {hasStructure && (
        existingBays > 0 ? <p>{existingBays} Bays</p> : <p>{existingShelves} Shelves</p>
      )}
      {existingPositionedBins > 0 && <p>{existingPositionedBins} Designed Bins</p>}
      {existingCustomBins > 0 && <p>{existingCustomBins} Custom Bins</p>}
      {mutable && <button className="button button-secondary" onClick={() => setMode('design')} disabled={saving}>Edit</button>}
    </div>
  );
}

export function UnitPreparationPage() {
  const { unitId } = useParams();
  const view = useRefreshableData(() => preparationApi.getPreparation(unitId), [unitId]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const data = view.data;
  if (!data) {
    if (view.loading) return <LoadingState />;
    if (view.error) return <ErrorState error={view.error} onRetry={view.refresh} />;
    return null;
  }

  const mutable = data.unit.status === 'PREPARATION';

  const updateSide = async (config) => {
    setSaving(true);
    setError(null);
    try {
      const existingSide = data.sides.find(s => s.sideType === config.sideType);
      await applySideDesign(unitId, existingSide, config);
      await view.refresh();
    } catch (error) {
      console.error(error);
      setError("Couldn't save structure.");
    } finally {
      setSaving(false);
    }
  };

  const handleCustomBins = async (config) => {
    setSaving(true);
    setError(null);
    try {
      const existingSide = data.sides.find(s => s.sideType === config.sideType);
      await addCustomBins(unitId, existingSide, config.sideType, config.count);
      await view.refresh();
    } catch (error) {
      console.error(error);
      setError("Couldn't add custom bins.");
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    setSaving(true);
    setError(null);
    try {
      await preparationApi.finalizeUnit(unitId);
      await view.refresh();
    } catch (error) {
      console.error(error);
      setError("Couldn't finalize.");
    } finally {
      setSaving(false);
    }
  };
  
  const generateBasketBins = async (count) => {
    setSaving(true); setError(null);
    try {
      await preparationApi.generateBasketBins(unitId, count);
      await view.refresh();
    } catch (error) { 
      console.error(error);
      setError("Couldn't add bins."); 
    }
    finally { setSaving(false); }
  };

  return (
    <div className="redesigned-preparation">
      <div className="step-indicator">
        <Link to="/preparation">Zones</Link>
        <span className="arrow">→</span>
        <Link to={`/preparation/zones/${data.unit.zoneId}`}>Racks</Link>
        <span className="arrow">→</span>
        <strong>Design</strong>
      </div>

      <div className="page-heading minimal-heading">
        <h1>{data.unit.name || data.unit.code}</h1>
        <StatusBadge value={data.unit.status} />
      </div>

      {error && <div className="alert alert-error"><div>{error} <button onClick={() => setError(null)}>Dismiss</button></div></div>}

      {data.unitType === 'BASKET' ? (
        <section className="rack-design-container">
          <div className="rack-sides-row" style={{justifyContent: 'center', display: 'flex'}}>
            <BasketDesignBlock 
              unit={data.unit} 
              data={data} 
              onGenerate={generateBasketBins} 
              saving={saving} 
              mutable={mutable} 
            />
          </div>
          <div className="finalize-section card">
            <p className="eyebrow">Ready?</p>
            {mutable ? (
              <ConfirmAction label="Lock & Start Stock Take" message="Ready to start?" onConfirm={finalize} primary={true} disabled={saving || !data.summary.binCount} />
            ) : (
              <strong className="done-state">✓ Started</strong>
            )}
          </div>
        </section>
      ) : (
        <section className="rack-design-container">
          <div className="rack-sides-row">
            {['FRONT', 'RIGHT', 'BACK', 'LEFT'].map(type => (
               <SideDesignBlock 
                 key={type} 
                 sideType={type} 
                 existingSide={data.sides.find(s => s.sideType === type)} 
                 onUpdate={updateSide} 
                 onCustom={handleCustomBins}
                 saving={saving} 
                 mutable={mutable} 
               />
            ))}
          </div>

          <div className="finalize-section card">
            <p className="eyebrow">Ready?</p>
            <div className="side-checks">
               {['FRONT', 'RIGHT', 'BACK', 'LEFT'].map(type => (
                 <span key={type}>{type.charAt(0) + type.slice(1).toLowerCase()} {data.sides.some(s => s.sideType === type) ? '✓' : '—'}</span>
               ))}
            </div>
            {mutable ? (
              <ConfirmAction label="Lock & Start Stock Take" message="Ready to start?" onConfirm={finalize} primary={true} disabled={saving || data.sides.length === 0} />
            ) : (
              <strong className="done-state">✓ Started</strong>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
