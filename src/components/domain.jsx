import { Link } from 'react-router-dom';
import { ProgressBar, StatusBadge } from './common.jsx';

export function AssignedUnitCard({ unit, to }) {
  return (
    <Link className="card assigned-card" to={to}>
      <h2>{unit.zone?.name || unit.zone?.code || unit.assignedUnitName || 'Work'}</h2>
      <span>{unit.leader?.username || 'Unassigned'}</span>
      {unit.assignedUnitStatus === 'RECHECK' && <strong className="recheck-note">⚠ Recheck</strong>}
      <strong className="worker-progress-number">{unit.progress?.completedBins || 0} / {unit.progress?.totalBins || 0}</strong>
      <span className="button button-primary card-action">Open</span>
    </Link>
  );
}

export function BinBlock({ bin, to, onClick, assignment }) {
  const content = <><strong>{bin.code}</strong><span>Bin {bin.binNumber}</span><StatusBadge value={bin.stockStatus} />{assignment ? <small className="bin-assignment">{assignment.assignedUnitCode}</small> : assignment === null ? <small className="bin-assignment unassigned">Unassigned</small> : null}</>;
  return to ? <Link className="bin-block" to={to}>{content}</Link> : onClick ? <button type="button" className="bin-block interactive" onClick={onClick}>{content}</button> : <div className="bin-block">{content}</div>;
}

export function UnitBlock({ unit, expanded, onToggle, detail, detailLoading, detailError, coverageByBin, binFilter, onBinSelect, assignments = [] }) {
  const allBins = detail?.unitType === 'RACK'
    ? (detail.structure?.sides || []).flatMap((side) => (side.bins || []).map((bin) => ({ ...bin, sideCode: side.code })))
    : detail?.structure?.bins || [];
  const bins = allBins.filter((bin) => !binFilter || binFilter(bin, coverageByBin?.get(bin.id), unit));
  return (
    <article className="unit-block">
      <button type="button" className="unit-heading" onClick={onToggle} aria-expanded={expanded}>
        <div><span className="eyebrow">{unit.code} · {unit.unitType}</span><h3>{unit.name}</h3></div>
        <div className="unit-heading-status"><StatusBadge value={unit.stockTakeStatus} /><span aria-hidden="true">{expanded ? '−' : '+'}</span></div>
      </button>
      <div className="unit-summary"><span className="progress-context">Physical progress</span><ProgressBar progress={unit.progress} />{assignments.length > 0 && <div className="unit-assignments">{assignments.map((assignment) => <Link key={assignment.id} to={`/assigned-units/${assignment.id}`}>{assignment.assignedUnitCode}<StatusBadge value={assignment.assignedUnitStatus} /></Link>)}</div>}</div>
      {expanded && <div className="unit-detail">
        {detailLoading && <p>Loading bins…</p>}
        {detailError && <p className="text-error">{detailError.message}</p>}
        {detail && !bins.length && <p className="muted">No Bins match the current filters.</p>}
        {detail && <div className="bin-grid">{bins.map((bin) => { const coverage = coverageByBin?.get(bin.id); return <BinBlock key={bin.id} bin={bin} assignment={coverage?.assignedUnitId ? coverage : null} onClick={onBinSelect ? () => onBinSelect({ ...bin, assignment: coverage?.assignedUnitId ? { id: coverage.assignedUnitId, code: coverage.assignedUnitCode, status: coverage.assignedUnitStatus, leader: coverage.leaderId ? { id: coverage.leaderId, username: coverage.leaderUsername } : null } : null }) : undefined} />; })}</div>}
      </div>}
    </article>
  );
}

export function ZoneCard({ zone, units, selected, onSelect }) {
  const progress = units.reduce((result, unit) => ({ totalBins: result.totalBins + Number(unit.progress?.totalBins || 0), completedBins: result.completedBins + Number(unit.progress?.completedBins || 0) }), { totalBins: 0, completedBins: 0 });
  progress.progressPercent = progress.totalBins ? Math.round((progress.completedBins / progress.totalBins) * 100) : 0;
  return <button type="button" className={`zone-card ${selected ? 'selected' : ''}`} onClick={onSelect}><span className="eyebrow">Zone</span><strong>{zone.name || zone.code}</strong><span>{units.length} units</span><ProgressBar progress={progress} /></button>;
}
