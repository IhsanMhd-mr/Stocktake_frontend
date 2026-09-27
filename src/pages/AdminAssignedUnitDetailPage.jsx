import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { teamAssignmentApi } from '../api/team-assignment.api.js';
import { BinBlock } from '../components/domain.jsx';
import { EmptyState, ErrorState, LoadingState, ProgressBar, RefreshButton, StatusBadge } from '../components/common.jsx';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js';
import { useRefreshableData } from '../hooks/useRefreshableData.js';
import { useRealtime } from '../realtime/RealtimeContext.js';
import { displayName } from '../utils/format.js';

export function AdminAssignedUnitDetailPage() {
  const { assignedUnitId } = useParams();
  const view = useRefreshableData(() => teamAssignmentApi.get(assignedUnitId), [assignedUnitId]);
  const { lastEvent } = useRealtime();
  const [status, setStatus] = useState('PENDING');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [mutationMessage, setMutationMessage] = useState(null);
  const [mutationError, setMutationError] = useState(null);

  useEffect(() => { if (view.data) { setStatus(view.data.assignedUnitStatus); setMemo(view.data.assignedUnitStatusMemo || ''); } }, [view.data]);
  useRealtimeRefresh(lastEvent, (event) => {
    const assignmentEvent = ['ASSIGNED_UNIT', 'ASSIGNED_UNIT_LEADER', 'ASSIGNED_UNIT_STATUS'].includes(event.entityType) && event.entityId === assignedUnitId;
    return assignmentEvent || ['BIN_STOCK', 'BIN_STOCK_STATUS', 'STOCK_TAKE_UNIT', 'UNIT', 'BIN'].includes(event.entityType);
  }, view.refresh, 300);

  const save = async () => {
    setSaving(true); setMutationError(null); setMutationMessage(null);
    try {
      await teamAssignmentApi.updateStatus(assignedUnitId, { status, memo: memo.trim() || null, statusVersion: view.data.assignedUnitStatusVersion });
      await view.refresh();
      setMutationMessage('✓ Saved');
    } catch (error) {
      setMutationError(error);
      if (error.code === 'STALE_VERSION') {
        setMutationMessage('Changed on another device. Latest data loaded.');
        await view.refresh().catch(() => {});
      }
    } finally { setSaving(false); }
  };

  const unit = view.data;
  return (
    <>
      <Link className="back-link" to="/assigned-units">← Work Sections</Link>
      <div className="page-heading minimal-heading"><div><h1>{unit?.zone?.name || unit?.assignedUnitName || 'Work'}</h1>{unit && <Link className="button button-secondary heading-action" to={`/assigned-units/${assignedUnitId}/edit`}>Edit Work</Link>}</div><RefreshButton onClick={() => view.refresh().catch(() => {})} refreshing={view.refreshing} /></div>
      {view.loading && <LoadingState />}
      {view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}
      {view.error && view.data && <div className="alert alert-warning">Live refresh failed. Showing the last successful detail.</div>}
      {mutationMessage && <div className="alert alert-info">{mutationMessage}</div>}
      {mutationError && <div className="alert alert-error">{mutationError.message}</div>}
      {unit && <>
        <section className="summary-strip"><div><span>Zone</span><strong>{unit.zone?.name || unit.zone?.code || '—'}</strong></div><div><span>Assigned To</span><strong>{unit.leader?.username || 'Not assigned'}</strong></div><div className="summary-progress"><ProgressBar progress={unit.progress} /></div></section>
        <div className="detail-columns"><div className="stack">{!unit.physicalUnits.length && <EmptyState title="No Bins." />}{unit.physicalUnits.map((physicalUnit) => <section className="card physical-unit" key={physicalUnit.id}><div className="card-title-row"><div><h2>{physicalUnit.name || physicalUnit.code}</h2></div><StatusBadge value={physicalUnit.stockTakeStatus} /></div><div className="bin-grid">{physicalUnit.bins.map((bin) => <BinBlock key={bin.id} bin={bin} />)}</div></section>)}</div>
          <aside className="card status-editor"><h2>Update Work</h2><label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}>{['PENDING', 'IN_PROGRESS', 'DONE', 'RECHECK'].map((value) => <option key={value} value={value}>{displayName(value)}</option>)}</select></label><label>{status === 'RECHECK' ? 'Recheck note' : 'Note'} <span className="optional">Optional</span><textarea rows="4" maxLength="2000" value={memo} onChange={(e) => setMemo(e.target.value)} /></label><button className="button button-primary button-wide" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button></aside>
        </div>
      </>}
    </>
  );
}
