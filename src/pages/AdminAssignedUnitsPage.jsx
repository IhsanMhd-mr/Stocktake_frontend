import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamAssignmentApi } from '../api/team-assignment.api.js';
import { AssignedUnitCard } from '../components/domain.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/common.jsx';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js';
import { useRefreshableData } from '../hooks/useRefreshableData.js';
import { useRealtime } from '../realtime/RealtimeContext.js';
import { displayName } from '../utils/format.js';

const ASSIGNED_ENTITIES = new Set(['ASSIGNED_UNIT', 'ASSIGNED_UNIT_LEADER', 'ASSIGNED_UNIT_STATUS', 'BIN_STOCK', 'BIN_STOCK_STATUS', 'STOCK_TAKE_UNIT', 'UNIT', 'BIN']);

export function AdminAssignedUnitsPage() {
  const view = useRefreshableData(teamAssignmentApi.list, []);
  const { lastEvent } = useRealtime();
  const [filters, setFilters] = useState({ zone: '', leader: '', status: '', lifecycle: '' });
  const [showFilters, setShowFilters] = useState(false);
  useRealtimeRefresh(lastEvent, (event) => ASSIGNED_ENTITIES.has(event.entityType), view.refresh, 300);

  const units = useMemo(() => (view.data || []).filter((unit) =>
    (!filters.zone || unit.zone?.id === filters.zone) &&
    (!filters.leader || (filters.leader === 'unassigned' ? !unit.leader : unit.leader?.id === filters.leader)) &&
    (!filters.status || unit.assignedUnitStatus === filters.status) &&
    (!filters.lifecycle || unit.lifecycleStatus === filters.lifecycle)
  ), [view.data, filters]);
  const zones = [...new Map((view.data || []).filter((unit) => unit.zone).map((unit) => [unit.zone.id, unit.zone])).values()];
  const leaders = [...new Map((view.data || []).filter((unit) => unit.leader).map((unit) => [unit.leader.id, unit.leader])).values()];
  const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));

  return (
    <>
      <div className="page-heading minimal-heading"><div><h1>Assign Work</h1><Link className="button button-primary heading-action" to="/assigned-units/new">New Work</Link></div></div>
      <button className="button button-secondary" type="button" onClick={() => setShowFilters((value) => !value)}>{showFilters ? 'Hide Filters' : 'Show Filters'}</button>
      {showFilters && <section className="filter-bar" aria-label="Work Section filters"><label>Zone<select value={filters.zone} onChange={(e) => setFilter('zone', e.target.value)}><option value="">All zones</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name || zone.code}</option>)}</select></label><label>Assigned To<select value={filters.leader} onChange={(e) => setFilter('leader', e.target.value)}><option value="">Everyone</option><option value="unassigned">Not assigned</option>{leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.username}</option>)}</select></label><label>Work Status<select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}><option value="">All statuses</option>{['PENDING', 'IN_PROGRESS', 'DONE', 'RECHECK'].map((value) => <option key={value} value={value}>{displayName(value)}</option>)}</select></label><label>Setup Status<select value={filters.lifecycle} onChange={(e) => setFilter('lifecycle', e.target.value)}><option value="">All</option>{['DRAFT', 'ACTIVE'].map((value) => <option key={value} value={value}>{displayName(value)}</option>)}</select></label></section>}
      {view.loading && <LoadingState />}
      {view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}
      {view.error && view.data && <div className="alert alert-warning">Live refresh failed. Showing the last successful snapshot.</div>}
      {view.data && !units.length && <EmptyState title="No work." />}
      {view.data && <div className="card-grid">{units.map((unit) => <AssignedUnitCard key={unit.id} unit={unit} to={`/assigned-units/${unit.id}`} />)}</div>}
    </>
  );
}
