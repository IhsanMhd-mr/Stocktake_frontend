import { useState } from 'react';
import { preparationApi } from '../api/preparation.api.js';

const sideTypes = ['FRONT', 'RIGHT', 'BACK', 'LEFT'];
const labels = { FRONT: 'Front', RIGHT: 'Right', BACK: 'Back', LEFT: 'Left' };
const defaults = () => ({ layout: '', shelfCount: 3, bayCount: 3, shelvesPerBay: 6, binsPerShelf: 3 });

export function QuickSetup({ data, refresh, onAdvanced }) {
  const [step, setStep] = useState('sides');
  const [selected, setSelected] = useState(new Set(['FRONT']));
  const [sideIndex, setSideIndex] = useState(0);
  const [configs, setConfigs] = useState(() => Object.fromEntries(sideTypes.map((type) => [type, defaults()])));
  const [basketCount, setBasketCount] = useState(40);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const existing = data.summary.binCount > 0 || data.summary.sideCount > 0 || data.summary.shelfCount > 0;
  const selectedSides = [...selected];
  const currentSide = selectedSides[sideIndex];
  const preview = selectedSides.map((type) => {
    const config = configs[type];
    const shelves = config.layout === 'SHELVES' ? Number(config.shelfCount) : Number(config.bayCount) * Number(config.shelvesPerBay);
    return { type, ...config, shelves, bins: shelves * Number(config.binsPerShelf) };
  });
  const change = (type, key, value) => setConfigs((current) => ({ ...current, [type]: { ...current[type], [key]: value } }));

  const stop = async (caught) => {
    setError(caught); setMessage('Setup stopped. Open Advanced Setup.');
    await refresh().catch(() => {});
  };
  const createRack = async () => {
    const positive = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
    const invalid = preview.some((item) => !item.layout || item.bins > 10000 || !positive(item.binsPerShelf) || (item.layout === 'SHELVES' ? !positive(item.shelfCount) : !positive(item.bayCount) || !positive(item.shelvesPerBay)));
    if (invalid) return setError(new Error('Check the numbers.'));
    setCreating(true); setError(null);
    try {
      for (let index = 0; index < preview.length; index += 1) {
        const plan = preview[index];
        const side = await preparationApi.createSide(data.unit.id, { sideType: plan.type, displayOrder: index + 1 });
        const { bins } = await preparationApi.generateSideBins(side.id, plan.bins);
        let offset = 0;
        if (plan.layout === 'SHELVES') {
          for (let shelfNumber = 1; shelfNumber <= Number(plan.shelfCount); shelfNumber += 1) {
            const shelf = await preparationApi.createShelf(side.id, { shelfScope: 'STANDALONE', shelfNumber, displayOrder: shelfNumber });
            const ids = bins.slice(offset, offset + Number(plan.binsPerShelf)).map((bin) => bin.id); offset += ids.length;
            await preparationApi.assignShelfBins(shelf.id, ids);
          }
        } else {
          for (let bayNumber = 1; bayNumber <= Number(plan.bayCount); bayNumber += 1) {
            const bay = await preparationApi.createBay(side.id, { bayNumber, displayOrder: bayNumber });
            for (let shelfNumber = 1; shelfNumber <= Number(plan.shelvesPerBay); shelfNumber += 1) {
              const shelf = await preparationApi.createShelf(side.id, { shelfScope: 'BAY', bayId: bay.id, shelfNumber, displayOrder: shelfNumber });
              const ids = bins.slice(offset, offset + Number(plan.binsPerShelf)).map((bin) => bin.id); offset += ids.length;
              await preparationApi.assignShelfBins(shelf.id, ids);
            }
          }
        }
      }
      await refresh(); setMessage('✓ Rack created');
    } catch (caught) { await stop(caught); } finally { setCreating(false); }
  };
  const createBasket = async () => {
    if (!Number.isInteger(Number(basketCount)) || Number(basketCount) < 1) return setError(new Error('Check the number.'));
    setCreating(true); setError(null);
    try { await preparationApi.generateBasketBins(data.unit.id, Number(basketCount)); await refresh(); setMessage('✓ Basket created'); }
    catch (caught) { await stop(caught); } finally { setCreating(false); }
  };

  if (data.unit.status !== 'PREPARATION') return <section className="quick-setup ready-setup"><h2>✓ {data.unit.code}</h2><strong>{data.summary.binCount} Bins</strong><button className="button button-secondary" onClick={onAdvanced}>Details</button></section>;
  if (existing) return <section className="quick-setup ready-setup"><h2>✓ {data.unit.code} ready</h2><strong>{data.summary.binCount} Bins</strong>{message && <div className="success-line">{message}</div>}<a className="button button-primary" href="#review">Review</a><button className="button button-quiet" onClick={onAdvanced}>Advanced Setup</button>{error && <div className="alert alert-error">{error.message}</div>}</section>;
  if (data.unitType === 'BASKET') return <section className="quick-setup guided-setup"><h2>How many Bins?</h2><input className="big-number-input" aria-label="Number of bins" type="number" min="1" max="10000" value={basketCount} onChange={(event) => setBasketCount(event.target.value)} /><button className="button button-primary button-large" disabled={creating} onClick={createBasket}>{creating ? 'Creating…' : 'Create'}</button><button className="button button-quiet" onClick={onAdvanced}>Advanced Setup</button>{error && <div className="alert alert-error">{error.message}</div>}</section>;

  if (step === 'sides') return <section className="quick-setup guided-setup"><h2>Which sides are used?</h2><div className="choice-row">{sideTypes.map((type) => <label className={`choice-card ${selected.has(type) ? 'selected' : ''}`} key={type}><input type="checkbox" checked={selected.has(type)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(type) ? next.delete(type) : next.add(type); return next; })} /><span>{labels[type]}</span></label>)}</div><button className="button button-primary button-large" disabled={!selected.size} onClick={() => { setSideIndex(0); setStep('layout'); }}>Next</button><button className="button button-quiet" onClick={onAdvanced}>Advanced Setup</button></section>;

  if (step === 'layout') {
    const config = configs[currentSide];
    return <section className="quick-setup guided-setup"><h2>How is {labels[currentSide]} arranged?</h2><div className="layout-choices"><button className={`button choice-button ${config.layout === 'SHELVES' ? 'selected' : ''}`} onClick={() => change(currentSide, 'layout', 'SHELVES')}>Shelves</button><button className={`button choice-button ${config.layout === 'BAYS' ? 'selected' : ''}`} onClick={() => change(currentSide, 'layout', 'BAYS')}>Bays</button><button className="button choice-button" onClick={onAdvanced}>Advanced</button></div>{config.layout === 'SHELVES' && <div className="count-fields"><label>Shelves<input type="number" min="1" value={config.shelfCount} onChange={(event) => change(currentSide, 'shelfCount', event.target.value)} /></label><label>Bins per shelf<input type="number" min="1" value={config.binsPerShelf} onChange={(event) => change(currentSide, 'binsPerShelf', event.target.value)} /></label></div>}{config.layout === 'BAYS' && <div className="count-fields"><label>Bays<input type="number" min="1" value={config.bayCount} onChange={(event) => change(currentSide, 'bayCount', event.target.value)} /></label><label>Shelves per bay<input type="number" min="1" value={config.shelvesPerBay} onChange={(event) => change(currentSide, 'shelvesPerBay', event.target.value)} /></label><label>Bins per shelf<input type="number" min="1" value={config.binsPerShelf} onChange={(event) => change(currentSide, 'binsPerShelf', event.target.value)} /></label></div>}<div className="wizard-actions"><button className="button button-secondary" onClick={() => sideIndex ? setSideIndex(sideIndex - 1) : setStep('sides')}>Back</button><button className="button button-primary button-large" disabled={!config.layout} onClick={() => sideIndex < selectedSides.length - 1 ? setSideIndex(sideIndex + 1) : setStep('review')}>Next</button></div></section>;
  }

  return <section className="quick-setup guided-setup"><h2>Ready to create?</h2><div className="compact-preview">{preview.map((item) => <div key={item.type}><strong>{labels[item.type]}</strong><span>{item.layout === 'BAYS' ? `${item.bayCount} Bays` : `${item.shelfCount} Shelves`}</span><b>{item.bins} Bins</b></div>)}<strong>{preview.reduce((sum, item) => sum + item.bins, 0)} Bins total</strong></div><div className="wizard-actions"><button className="button button-secondary" onClick={() => { setSideIndex(selectedSides.length - 1); setStep('layout'); }}>Back</button><button className="button button-primary button-large" disabled={creating} onClick={createRack}>{creating ? 'Creating…' : 'Create'}</button></div>{error && <div className="alert alert-error">{error.message}</div>}</section>;
}
