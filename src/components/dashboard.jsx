import { stockTakeApi } from '../api/stock-take.api.js';
import { ErrorState, LoadingState, StatusBadge } from './common.jsx';
import { AssignmentBadge } from './visual-layout.jsx';
import { useRefreshableData } from '../hooks/useRefreshableData.js';

export function DashboardMetrics({ metrics }) {
  const cards = [
    ['Done', metrics.completedBins], ['Left', metrics.pendingBins],
    ['Rechecks', metrics.statuses.RECHECK || 0], ['Unassigned', metrics.unassignedBins]
  ];
  return <section className="metric-grid minimal-metrics" aria-label="Stock Take totals">{cards.map(([label, value]) => <article className="metric-card" key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>;
}

export function DashboardFilters({ filters, setFilters, zones, units, assignedUnits, leaders }) {
  const change = (name, value) => setFilters((current) => {
    const next = { ...current, [name]: value };
    if (name === 'zoneId') { next.unitId = ''; next.assignedUnitId = ''; }
    return next;
  });
  return <section className="dashboard-filters" aria-label="Dashboard filters"><label>Search<input value={filters.search} placeholder="Bin, rack, or Work Section" onChange={(e) => change('search', e.target.value)} /></label><label>Zone<select value={filters.zoneId} onChange={(e) => change('zoneId', e.target.value)}><option value="">All Zones</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.code} — {zone.name}</option>)}</select></label><label>Rack or Basket<select value={filters.unitId} onChange={(e) => change('unitId', e.target.value)}><option value="">All</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} — {unit.name}</option>)}</select></label><label>Work Section<select value={filters.assignedUnitId} onChange={(e) => change('assignedUnitId', e.target.value)}><option value="">All Work Sections</option>{assignedUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.assignedUnitCode} — {unit.assignedUnitName || 'Unnamed'}</option>)}</select></label><label>Assigned To<select value={filters.leaderId} onChange={(e) => change('leaderId', e.target.value)}><option value="">Everyone</option><option value="unassigned">Not Assigned</option>{leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.username}</option>)}</select></label><label>Work Status<select value={filters.operationalStatus} onChange={(e) => change('operationalStatus', e.target.value)}><option value="">All statuses</option>{['PENDING', 'IN_PROGRESS', 'DONE', 'RECHECK'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label>Bin Status<select value={filters.binStatus} onChange={(e) => change('binStatus', e.target.value)}><option value="">All statuses</option><option value="PENDING">Not Started</option><option value="COMPLETED">Done</option></select></label><button type="button" className="button button-secondary" onClick={() => setFilters({ zoneId: '', unitId: '', assignedUnitId: '', leaderId: '', operationalStatus: '', binStatus: '', search: '' })}>Clear Filters</button></section>;
}

export function AdminBinPanel({ bin, unit, onClose, onLeaderFilter }) {
  const view = useRefreshableData(async () => {
    const [items, status] = await Promise.all([stockTakeApi.getBinItems(bin.id), stockTakeApi.getBinStatus(bin.id)]);
    return { items, status };
  }, [bin.id]);
  return <div className="drawer-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><aside className="bin-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-bin-title"><div className="section-heading"><div><p className="eyebrow">{unit.code} · {unit.name}</p><h2 id="admin-bin-title">{bin.code}</h2></div><button type="button" className="button button-secondary" onClick={onClose}>Close</button></div>{view.loading && <LoadingState label="Loading Bin detail…" />}{view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}{view.data && <><dl className="drawer-details"><div><dt>Stock status</dt><dd><StatusBadge value={view.data.status.stockStatus} /></dd></div><div><dt>Items</dt><dd>{view.data.items.items.length}</dd></div><div><dt>Assignment</dt><dd><AssignmentBadge assignment={bin.assignment} /></dd></div><div><dt>Leader</dt><dd>{bin.assignment?.leader ? <button type="button" className="leader-filter-link" onClick={() => onLeaderFilter(bin.assignment.leader.id)}>{bin.assignment.leader.username}</button> : bin.assignment ? 'Unassigned' : 'Not assigned'}</dd></div></dl>{view.data.status.memo && <section><h3>Bin memo</h3><p>{view.data.status.memo}</p></section>}<section><h3>Stock items</h3>{view.data.items.items.length ? <div className="drawer-items">{view.data.items.items.map((item) => <div key={item.id}><strong>{item.itemName}</strong><span>{item.sku || 'No SKU'}</span><b>Qty {item.quantity}</b></div>)}</div> : <p className="muted">No stock items recorded.</p>}</section></>}</aside></div>;
}
