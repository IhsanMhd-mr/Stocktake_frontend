import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, StatusBadge } from './common.jsx';

export function ViewModeToggle({ value, onChange }) {
  return <div className="view-toggle" role="group" aria-label="View mode"><span>View:</span><button type="button" className={value === 'simple' ? 'active' : ''} aria-pressed={value === 'simple'} onClick={() => onChange('simple')}>Simple Blocks</button><button type="button" className={value === 'visual' ? 'active' : ''} aria-pressed={value === 'visual'} onClick={() => onChange('visual')}>Visual Layout</button></div>;
}

export function AssignmentBadge({ assignment }) {
  return assignment ? <Link className="assignment-badge" to={`/assigned-units/${assignment.id}`} onClick={(event) => event.stopPropagation()}>{assignment.code}</Link> : <span className="assignment-badge unassigned">Unassigned</span>;
}

export function VisualBin({ bin, onSelect }) {
  return <button type="button" className={`visual-bin ${bin.stockStatus === 'COMPLETED' ? 'completed' : 'pending'} ${bin.assignment ? 'assigned' : 'unassigned'}`} onClick={() => onSelect?.(bin)} aria-label={`${bin.code}, ${bin.stockStatus}, ${bin.assignment ? `assigned to ${bin.assignment.code}` : 'unassigned'}`}><strong>{bin.code}</strong><span>{bin.stockStatus === 'COMPLETED' ? '✓ Completed' : 'Pending'}</span>{bin.assignment && <small>{bin.assignment.code}</small>}</button>;
}

function ShelfVisual({ shelf, onBinSelect }) {
  return <section className="visual-shelf"><div className="visual-shelf-label"><strong>{shelf.structuralCode || shelf.code}</strong><span>{shelf.bins.length} Bins</span></div>{shelf.bins.length ? <div className="visual-shelf-bins">{shelf.bins.map((bin) => <VisualBin key={bin.id} bin={bin} onSelect={onBinSelect} />)}</div> : <p className="visual-empty">No Bins mapped</p>}</section>;
}

function BayVisual({ bay, onBinSelect }) {
  return <article className="visual-bay"><header><span>Bay</span><strong>{bay.code}</strong></header><div className="visual-shelves">{bay.shelves.length ? bay.shelves.map((shelf) => <ShelfVisual key={shelf.id} shelf={shelf} onBinSelect={onBinSelect} />) : <p className="visual-empty">No Shelves</p>}</div></article>;
}

export function RackVisual({ model, onBinSelect }) {
  const [activeSideId, setActiveSideId] = useState(model.sides[0]?.id || '');
  useEffect(() => {
    if (!model.sides.some((side) => side.id === activeSideId)) setActiveSideId(model.sides[0]?.id || '');
  }, [model.sides, activeSideId]);
  if (!model.sides.length) return <EmptyState title="No Sides configured">Add a Rack Side in Simple Blocks view.</EmptyState>;
  const side = model.sides.find((candidate) => candidate.id === activeSideId) || model.sides[0];
  return <section className="rack-visual"><div className="visual-unit-heading"><div><p className="eyebrow">{model.unit.code} · Rack</p><h2>{model.unit.name}</h2></div><div className="side-tabs" role="tablist" aria-label="Rack sides">{model.sides.map((candidate) => <button type="button" role="tab" aria-selected={candidate.id === side.id} className={candidate.id === side.id ? 'active' : ''} key={candidate.id} onClick={() => setActiveSideId(candidate.id)}>{candidate.sideType}</button>)}</div></div><div className="rack-side-title"><strong>{side.sideType}</strong><span>{side.bays.length} Bays · {side.standaloneShelves.length} standalone Shelves</span></div>{!side.bays.length && !side.standaloneShelves.length && <EmptyState title="No Bays or Shelves">This Side has no mapped physical structure yet.</EmptyState>}<div className="visual-columns">{side.bays.map((bay) => <BayVisual key={bay.id} bay={bay} onBinSelect={onBinSelect} />)}{!!side.standaloneShelves.length && <article className="visual-bay standalone"><header><span>Standalone</span><strong>SH</strong></header><div className="visual-shelves">{side.standaloneShelves.map((shelf) => <ShelfVisual key={shelf.id} shelf={shelf} onBinSelect={onBinSelect} />)}</div></article>}</div>{!!side.unmappedBins.length && <section className="unmapped-visual"><div><h3>Unmapped Bins</h3><p>These physical Bins are not assigned to a Shelf.</p></div><div className="visual-bin-flow">{side.unmappedBins.map((bin) => <VisualBin key={bin.id} bin={bin} onSelect={onBinSelect} />)}</div></section>}</section>;
}

export function BasketVisual({ model, zone, progress, onBinSelect }) {
  return <section className="basket-visual"><div className="visual-unit-heading"><div><p className="eyebrow">{model.unit.code} · Basket</p><h2>{model.unit.name}</h2></div><div className="visual-meta"><span>{zone?.code || 'Zone'}</span><span>{model.bins.length} Bins</span>{progress && <span>{progress.progressPercent}% physical progress</span>}</div></div>{model.bins.length ? <div className="visual-bin-flow basket-bins">{model.bins.map((bin) => <VisualBin key={bin.id} bin={bin} onSelect={onBinSelect} />)}</div> : <EmptyState title="No Bins configured">This Basket does not contain direct Bins.</EmptyState>}</section>;
}

export function UnitVisual({ model, zone, progress, onBinSelect }) {
  return model.unitType === 'RACK' ? <RackVisual model={model} onBinSelect={onBinSelect} /> : <BasketVisual model={model} zone={zone} progress={progress} onBinSelect={onBinSelect} />;
}

export function StatusLegend() {
  return <div className="status-legend" aria-label="Status legend"><strong>Legend</strong><span><i className="legend-dot pending" />Pending Bin</span><span><i className="legend-dot completed" />✓ Completed Bin</span><span><i className="legend-outline assigned" />Assigned</span><span><i className="legend-outline unassigned" />Unassigned</span><StatusBadge value="RECHECK" /><StatusBadge value="DONE" /></div>;
}
