import { stockTakeApi } from '../api/stock-take.api.js';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/common.jsx';
import { useRefreshableData } from '../hooks/useRefreshableData.js';

export function UserWorkPage() {
  const view = useRefreshableData(stockTakeApi.getMyAssignedUnits, []);
  return (
    <>
      <div className="page-heading minimal-heading"><h1>My Work</h1></div>
      {view.error && view.data && <div className="alert alert-warning">Connection lost. <button className="button button-secondary" onClick={() => view.refresh().catch(() => {})}>Try Again</button></div>}
      {view.loading && <LoadingState label="Loading…" />}
      {view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}
      {view.data && !view.data.length && <EmptyState title="No work assigned." />}
      {view.data && <div className="worker-work-list">{view.data.map((unit) => <article className={`worker-work-card ${unit.assignedUnitStatus === 'RECHECK' ? 'needs-recheck' : ''}`} key={unit.id}><h2>{unit.zone?.name || unit.zone?.code || unit.assignedUnitName || 'Work'}</h2>{unit.assignedUnitStatus === 'RECHECK' && <div className="worker-recheck"><strong>⚠ Recheck</strong><span>{unit.assignedUnitStatusMemo}</span></div>}<strong className="worker-progress-number">{unit.progress?.completedBins || 0} / {unit.progress?.totalBins || 0} done</strong><Link className="button button-primary button-large" to={`/my-work/${unit.id}`}>{Number(unit.progress?.completedBins || 0) ? 'Continue' : 'Start'}</Link></article>)}</div>}
    </>
  );
}
