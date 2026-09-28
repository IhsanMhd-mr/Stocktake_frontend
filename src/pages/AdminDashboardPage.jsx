import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { stockTakeApi } from '../api/stock-take.api.js';
import { teamAssignmentApi } from '../api/team-assignment.api.js';
import { AdminBinPanel, DashboardFilters, DashboardMetrics } from '../components/dashboard.jsx';
import { EmptyState, ErrorState, LoadingState, ProgressBar, RefreshButton, StatusBadge } from '../components/common.jsx';
import { UnitBlock } from '../components/domain.jsx';
import { StatusLegend, UnitVisual, ViewModeToggle } from '../components/visual-layout.jsx';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics.js';
import { useRefreshableData } from '../hooks/useRefreshableData.js';
import { useRealtime } from '../realtime/RealtimeContext.js';
import { filterVisualUnit, normalizeVisualUnit } from '../utils/visual-layout.js';

const DASHBOARD_ENTITIES = new Set(['ZONE', 'UNIT', 'SIDE', 'BIN', 'BAY', 'SHELF', 'SHELF_BIN', 'BIN_STOCK', 'BIN_STOCK_STATUS', 'STOCK_TAKE_UNIT', 'ASSIGNED_UNIT', 'ASSIGNED_UNIT_LEADER', 'ASSIGNED_UNIT_STATUS']);
const emptyFilters = { zoneId: '', unitId: '', assignedUnitId: '', leaderId: '', operationalStatus: '', binStatus: '', search: '' };

async function loadDashboard() {
  return await stockTakeApi.getMonitor();
}

export function AdminDashboardPage() {
  const view = useRefreshableData(loadDashboard, []);
  const [viewMode, setViewMode] = useState('simple');
  const [filters, setFilters] = useState(emptyFilters);
  const [expanded, setExpanded] = useState(new Set());
  const [details, setDetails] = useState({});
  const [selectedBin, setSelectedBin] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { lastEvent } = useRealtime();
  const data = view.data || { units: [], assignedUnits: [], coverage: { summary: { assignedBins: 0, unassignedBins: 0 }, bins: [] } };
  const metrics = useDashboardMetrics(data.units, data.assignedUnits, data.coverage);
  const coverageByBin = useMemo(() => new Map(data.coverage.bins.map((bin) => [bin.binId, bin])), [data.coverage.bins]);
  const coverageByUnit = useMemo(() => {
    const map = new Map();
    for (const bin of data.coverage.bins) map.set(bin.unitId, [...(map.get(bin.unitId) || []), bin]);
    return map;
  }, [data.coverage.bins]);

  const zones = useMemo(() => [...new Map(data.units.filter((unit) => unit.zone).map((unit) => [unit.zone.id, unit.zone])).values()].sort((a, b) => a.code.localeCompare(b.code)), [data.units]);
  const unitOptions = useMemo(() => data.units.filter((unit) => !filters.zoneId || unit.zone?.id === filters.zoneId), [data.units, filters.zoneId]);
  const assignmentOptions = useMemo(() => data.assignedUnits.filter((unit) => !filters.zoneId || unit.zone?.id === filters.zoneId), [data.assignedUnits, filters.zoneId]);
  const leaders = useMemo(() => [...new Map(data.assignedUnits.filter((unit) => unit.leader).map((unit) => [unit.leader.id, unit.leader])).values()].sort((a, b) => a.username.localeCompare(b.username)), [data.assignedUnits]);

  const coverageMatches = useCallback((row, includeSearch = true) => {
    if (filters.assignedUnitId && row.assignedUnitId !== filters.assignedUnitId) return false;
    if (filters.leaderId === 'unassigned' && (!row.assignedUnitId || row.leaderId)) return false;
    if (filters.leaderId && filters.leaderId !== 'unassigned' && row.leaderId !== filters.leaderId) return false;
    if (filters.operationalStatus && row.assignedUnitStatus !== filters.operationalStatus) return false;
    if (filters.binStatus && row.stockStatus !== filters.binStatus) return false;
    if (includeSearch && filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      const binCode = `bn${String(row.binNumber).padStart(3, '0')}`;
      if (![binCode, row.assignedUnitCode, row.assignedUnitName, row.leaderUsername].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))) return false;
    }
    return true;
  }, [filters]);

  const hasBinFilters = Boolean(filters.assignedUnitId || filters.leaderId || filters.operationalStatus || filters.binStatus);
  const filteredUnits = useMemo(() => data.units.filter((unit) => {
    if (filters.zoneId && unit.zone?.id !== filters.zoneId) return false;
    if (filters.unitId && unit.id !== filters.unitId) return false;
    const rows = coverageByUnit.get(unit.id) || [];
    const query = filters.search.trim().toLowerCase();
    const unitMatchesSearch = !query || [unit.code, unit.name, unit.zone?.code, unit.zone?.name].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    if (!unitMatchesSearch && !rows.some((row) => coverageMatches(row, true))) return false;
    return !hasBinFilters || rows.some((row) => coverageMatches(row, false));
  }), [data.units, filters, coverageByUnit, coverageMatches, hasBinFilters]);

  const groupedZones = useMemo(() => {
    const map = new Map();
    for (const unit of filteredUnits) {
      const zone = unit.zone || { id: 'unassigned', code: 'UNASSIGNED', name: 'Unassigned' };
      if (!map.has(zone.id)) map.set(zone.id, { zone, units: [] });
      map.get(zone.id).units.push(unit);
    }
    return [...map.values()].sort((a, b) => a.zone.code.localeCompare(b.zone.code));
  }, [filteredUnits]);

  const assignmentsForUnit = useCallback((unitId) => {
    const ids = new Set((coverageByUnit.get(unitId) || []).filter((row) => row.assignedUnitId && coverageMatches(row, false)).map((row) => row.assignedUnitId));
    return data.assignedUnits.filter((assignment) => ids.has(assignment.id));
  }, [coverageByUnit, coverageMatches, data.assignedUnits]);
  const binFilter = useCallback((bin, coverage, unit) => {
    if (!coverage) return false;
    if (!coverageMatches(coverage, true)) {
      const query = filters.search.trim().toLowerCase();
      const unitMatch = !hasBinFilters && query && [unit.code, unit.name, unit.zone?.code, unit.zone?.name].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      if (!unitMatch && (!query || !String(bin.code).toLowerCase().includes(query))) return false;
    }
    return true;
  }, [coverageMatches, filters.search, hasBinFilters]);

  const loadDetail = useCallback(async (unitId) => {
    setDetails((current) => ({ ...current, [unitId]: { ...current[unitId], loading: true, error: null } }));
    try {
      const detail = await stockTakeApi.getUnit(unitId);
      setDetails((current) => ({ ...current, [unitId]: { data: detail, loading: false, error: null } }));
      return detail;
    } catch (error) {
      setDetails((current) => ({ ...current, [unitId]: { ...current[unitId], loading: false, error } }));
      throw error;
    }
  }, []);

  const toggleUnit = (unitId) => {
    const opening = !expanded.has(unitId);
    setExpanded((current) => { const next = new Set(current); if (next.has(unitId)) next.delete(unitId); else next.add(unitId); return next; });
    if (opening && !details[unitId]?.data) loadDetail(unitId).catch(() => {});
  };
  const selectVisualUnit = (unitId) => {
    setFilters((current) => ({ ...current, unitId }));
    if (!details[unitId]?.data) loadDetail(unitId).catch(() => {});
  };
  useEffect(() => {
    if (viewMode === 'visual' && filters.unitId && !details[filters.unitId]?.data && !details[filters.unitId]?.loading) loadDetail(filters.unitId).catch(() => {});
  }, [viewMode, filters.unitId, details, loadDetail]);

  const refreshDashboard = useCallback(async () => {
    await view.refresh();
    const activeDetails = new Set([...expanded, ...(filters.unitId ? [filters.unitId] : [])]);
    await Promise.all([...activeDetails].map((unitId) => loadDetail(unitId).catch(() => null)));
  }, [view.refresh, expanded, filters.unitId, loadDetail]);
  useRealtimeRefresh(lastEvent, (event) => DASHBOARD_ENTITIES.has(event.entityType), refreshDashboard, 300);

  const selectedVisualUnit = filters.unitId ? data.units.find((unit) => unit.id === filters.unitId) : null;
  const selectedDetail = selectedVisualUnit ? details[selectedVisualUnit.id] : null;
  const selectedCoverage = selectedVisualUnit ? coverageByUnit.get(selectedVisualUnit.id) || [] : [];
  const selectedVisualModel = selectedDetail?.data && selectedVisualUnit
    ? filterVisualUnit(
      normalizeVisualUnit(selectedDetail.data, selectedCoverage),
      (bin) => binFilter(bin, coverageByBin.get(bin.id), selectedVisualUnit)
    )
    : null;

  return <>
    <div className="page-heading"><div><h1>Stock Take</h1></div><div className="refresh-controls"><RefreshButton onClick={() => refreshDashboard().catch(() => {})} refreshing={view.refreshing} /></div></div>
    {view.loading && <LoadingState label="Loading operations…" />}{view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}{view.error && view.data && <div className="alert alert-warning">Live refresh failed. Showing the last successful dashboard snapshot.</div>}
    {view.data && <><DashboardMetrics metrics={metrics} /><div className="monitor-work-list">{data.assignedUnits.filter((unit) => unit.lifecycleStatus !== 'DRAFT').map((unit) => <article className="monitor-work-card" key={unit.id}><div><h2>{unit.zone?.name || unit.zone?.code || 'Zone'}</h2><span>{unit.leader?.username || 'Unassigned'}</span></div><strong>{unit.progress?.completedBins || 0} / {unit.progress?.totalBins || 0}</strong><Link className="button button-primary" to={`/assigned-units/${unit.id}`}>Open</Link></article>)}</div><button className="button button-secondary details-toggle" type="button" onClick={() => setShowDetails((value) => !value)}>{showDetails ? 'Hide Details' : 'Details'}</button>{showDetails && <><button className="button button-secondary" type="button" onClick={() => setShowFilters((value) => !value)}>{showFilters ? 'Hide Filters' : 'Filters'}</button>{showFilters && <DashboardFilters filters={filters} setFilters={setFilters} zones={zones} units={unitOptions} assignedUnits={assignmentOptions} leaders={leaders} />}<div className="dashboard-view-row"><ViewModeToggle value={viewMode} onChange={setViewMode} /></div><StatusLegend />
      {!filteredUnits.length && <EmptyState title="No dashboard results">Clear or change the filters to see physical Units.</EmptyState>}
      {viewMode === 'simple' && groupedZones.map(({ zone, units }) => <section className="zone-sheet" key={zone.id}><div className="zone-section-heading"><div><p className="eyebrow">{zone.code}</p><h2>{zone.name || zone.code}</h2></div><Link className="button button-secondary" to={`/preparation/zones/${zone.id}`}>Open Zone</Link></div><div className="stack">{units.map((unit) => <UnitBlock key={unit.id} unit={unit} expanded={expanded.has(unit.id)} onToggle={() => toggleUnit(unit.id)} detail={details[unit.id]?.data} detailLoading={details[unit.id]?.loading} detailError={details[unit.id]?.error} coverageByBin={coverageByBin} binFilter={binFilter} onBinSelect={(bin) => setSelectedBin({ bin, unit })} assignments={assignmentsForUnit(unit.id)} />)}</div></section>)}
      {viewMode === 'visual' && !selectedVisualUnit && groupedZones.map(({ zone, units }) => <section className="zone-sheet visual-zone" key={zone.id}><div className="zone-section-heading"><div><p className="eyebrow">{zone.code}</p><h2>{zone.name || zone.code}</h2></div><Link className="button button-secondary" to={`/preparation/zones/${zone.id}`}>Open Zone</Link></div><div className="visual-unit-grid">{units.map((unit) => <article className="visual-unit-card" key={unit.id}><div><p className="eyebrow">{unit.unitType}</p><h3>{unit.code}</h3><p>{unit.name}</p></div><StatusBadge value={unit.stockTakeStatus} /><span className="progress-context">Physical progress</span><ProgressBar progress={unit.progress} /><div className="unit-assignments">{assignmentsForUnit(unit.id).map((assignment) => <Link key={assignment.id} to={`/assigned-units/${assignment.id}`}>{assignment.assignedUnitCode}<StatusBadge value={assignment.assignedUnitStatus} /></Link>)}</div><button className="button button-primary" onClick={() => selectVisualUnit(unit.id)}>Open Visual Layout</button></article>)}</div></section>)}
      {viewMode === 'visual' && selectedVisualUnit && <section className="dashboard-visual-detail"><div className="visual-drill-heading"><button className="button button-secondary" onClick={() => setFilters((current) => ({ ...current, unitId: '' }))}>← Back to Units</button><Link className="button button-secondary" to={`/preparation/units/${selectedVisualUnit.id}`}>Open Unit</Link></div>{selectedDetail?.loading && <LoadingState label="Loading structural hierarchy…" />}{selectedDetail?.error && <ErrorState error={selectedDetail.error} onRetry={() => loadDetail(selectedVisualUnit.id).catch(() => {})} />}{selectedVisualModel && <UnitVisual model={selectedVisualModel} zone={selectedVisualUnit.zone} progress={selectedVisualUnit.progress} onBinSelect={(bin) => setSelectedBin({ bin, unit: selectedVisualUnit })} />}</section>}
    </>}</>}
    {selectedBin && <AdminBinPanel bin={selectedBin.bin} unit={selectedBin.unit} onClose={() => setSelectedBin(null)} onLeaderFilter={(leaderId) => { setFilters((current) => ({ ...current, leaderId })); setSelectedBin(null); }} />}
  </>;
}
