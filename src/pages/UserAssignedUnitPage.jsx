import { Link, useParams } from 'react-router-dom';
import { stockTakeApi } from '../api/stock-take.api.js';
import { BinBlock } from '../components/domain.jsx';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../components/common.jsx';
import { useRefreshableData } from '../hooks/useRefreshableData.js';
import { useState } from 'react';

export function UserAssignedUnitPage() {
  const { assignedUnitId } = useParams();
  const view = useRefreshableData(() => stockTakeApi.getMyAssignedUnit(assignedUnitId), [assignedUnitId]);
  const [showAll, setShowAll] = useState(false);
  const unit = view.data;
  const bins = unit?.physicalUnits.flatMap((physicalUnit) => physicalUnit.bins.map((bin) => ({ ...bin, physicalUnit }))) || [];
  const nextBin = bins.find((bin) => bin.stockStatus !== 'COMPLETED') || (unit?.assignedUnitStatus === 'RECHECK' ? bins[0] : null);
  return (
    <>
      <Link className="back-link" to="/my-work">← My work</Link>
      <div className="page-heading minimal-heading"><h1>{unit?.zone?.name || unit?.zone?.code || 'My Work'}</h1></div>
      {view.error && view.data && <div className="alert alert-warning">Connection lost. <button className="button button-secondary" onClick={() => view.refresh().catch(() => {})}>Try Again</button></div>}
      {view.loading && <LoadingState />}
      {view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}
      {unit && <>
        {unit.assignedUnitStatus === 'RECHECK' && <div className="worker-recheck large"><strong>⚠ Recheck</strong><span>{unit.assignedUnitStatusMemo || 'Check this work again.'}</span></div>}
        <strong className="worker-progress-number">{unit.progress?.completedBins || 0} / {unit.progress?.totalBins || 0} done</strong>
        {!bins.length && <EmptyState title="No bins." />}
        {bins.length > 0 && <section className="next-work-card">{nextBin ? <Link className="button button-primary button-large" to={`/my-work/${assignedUnitId}/bin/${nextBin.id}`}>Continue Next Bin</Link> : <strong>✓ All done</strong>}</section>}
        {bins.length > 0 && <button className="button button-secondary" type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Hide' : 'View All'}</button>}
        {showAll && <div className="stack">{unit.physicalUnits.map((physicalUnit) => <section className="card physical-unit" key={physicalUnit.id}><div className="card-title-row"><div><p className="eyebrow">{physicalUnit.code} · {physicalUnit.unitType}</p><h2>{physicalUnit.name}</h2></div><StatusBadge value={physicalUnit.stockTakeStatus} /></div><div className="bin-grid">{physicalUnit.bins.map((bin) => <BinBlock key={bin.id} bin={bin} to={`/my-work/${assignedUnitId}/bin/${bin.id}`} />)}</div></section>)}</div>}
      </>}
    </>
  );
}
