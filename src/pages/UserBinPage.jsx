import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { stockTakeApi } from '../api/stock-take.api.js';
import { ErrorState, LoadingState } from '../components/common.jsx';
import { useRefreshableData } from '../hooks/useRefreshableData.js';
import { isLockedError } from '../utils/format.js';

const blankItem = () => ({ localId: crypto.randomUUID(), itemName: '', sku: '', quantity: 0, memo: '' });

export function UserBinPage() {
  const { assignedUnitId, binId } = useParams();
  const view = useRefreshableData(async () => {
    const [assignedUnit, items, status] = await Promise.all([stockTakeApi.getMyAssignedUnit(assignedUnitId), stockTakeApi.getBinItems(binId), stockTakeApi.getBinStatus(binId)]);
    return { assignedUnit, items, status };
  }, [assignedUnitId, binId]);
  const [rows, setRows] = useState([]);
  const [statusMemo, setStatusMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [, setMutationError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!view.data) return;
    setRows(view.data.items.items.map((item) => ({ ...item, localId: item.id || crypto.randomUUID(), sku: item.sku || '', memo: item.memo || '' })));
    setStatusMemo(view.data.status.memo || '');
  }, [view.data]);

  const orderedBins = useMemo(() => view.data?.assignedUnit.physicalUnits.flatMap((unit) => unit.bins.map((candidate) => ({ ...candidate, physicalUnit: unit }))) || [], [view.data]);
  const binIndex = orderedBins.findIndex((candidate) => candidate.id === binId);
  const bin = orderedBins[binIndex];
  const physicalUnit = bin?.physicalUnit;
  const previousBin = binIndex > 0 ? orderedBins[binIndex - 1] : null;
  const nextBin = binIndex >= 0 ? orderedBins[binIndex + 1] : null;
  const locked = physicalUnit?.stockTakeStatus === 'COMPLETED';
  const completed = view.data?.status.stockStatus === 'COMPLETED';

  const updateRow = (localId, field, value) => setRows((current) => current.map((row) => row.localId === localId ? { ...row, [field]: value } : row));
  const handleMutationError = async (error, partiallySaved = false) => {
    setMutationError(error);
    if (partiallySaved) setNotice('Items saved. Refresh and try again.');
    else if (error.code === 'STALE_VERSION') setNotice('This Bin changed on another device. Latest data loaded.');
    else if (isLockedError(error)) setNotice('Stock Take is locked. You can view only.');
    else setNotice('Connection lost. Try again.');
    if (partiallySaved || error.code === 'STALE_VERSION' || isLockedError(error)) await view.refresh().catch(() => {});
  };

  const itemPayload = () => {
    const items = rows.map((row) => ({ ...(row.id ? { id: row.id } : {}), itemName: row.itemName.trim(), sku: row.sku.trim() || null, quantity: Number(row.quantity), memo: row.memo.trim() || null }));
    if (items.some((item) => !item.itemName || !Number.isInteger(item.quantity) || item.quantity < 0)) throw new Error('Each item needs a name and a whole quantity of zero or more.');
    return items;
  };

  const save = async (targetStatus = view.data.status.stockStatus) => {
    setSaving(true); setMutationError(null); setNotice(null);
    let itemsSaved = false;
    try {
      await stockTakeApi.updateBinItems(binId, { stockVersion: view.data.items.stockVersion, items: itemPayload() }, crypto.randomUUID());
      itemsSaved = true;
      await stockTakeApi.updateBinStatus(binId, { stockStatus: targetStatus, memo: statusMemo.trim() || null, stockStatusVersion: view.data.status.stockStatusVersion });
      await view.refresh();
      setNotice(targetStatus === 'COMPLETED' ? '✓ Bin done' : targetStatus === 'PENDING' ? '✓ Reopened' : '✓ Saved');
    } catch (error) { await handleMutationError(error, itemsSaved); } finally { setSaving(false); }
  };

  return <>
    <div className="bin-breadcrumb"><Link to="/my-work">My Work</Link><span>›</span><Link to={`/my-work/${assignedUnitId}`}>{view.data?.assignedUnit.zone?.name || 'Work Section'}</Link><span>›</span><span>{physicalUnit?.code || 'Unit'}</span><span>›</span><strong>{bin?.code || view.data?.items.bin.code || 'Bin'}</strong></div>
    <div className="page-heading minimal-heading"><h1>{bin?.code || view.data?.items.bin.code || 'Bin'}</h1></div>
    {view.loading && <LoadingState label="Loading…" />}
    {view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}
    {view.error && view.data && <div className="alert alert-warning">Connection lost. <button className="button button-secondary" onClick={() => view.refresh().catch(() => {})}>Try Again</button></div>}
    {locked && <div className="alert alert-warning"><strong>Stock Take is locked.</strong> You can view only.</div>}
    {notice && <div className="alert alert-info" role="status">{notice}</div>}
    {view.data && completed && <section className="completed-bin"><strong className="done-state">✓ Done</strong>{nextBin ? <Link className="button button-primary button-large" to={`/my-work/${assignedUnitId}/bin/${nextBin.id}`}>Next Bin</Link> : <Link className="button button-primary button-large" to={`/my-work/${assignedUnitId}`}>Done</Link>}<button className="button button-secondary" disabled={locked || saving} onClick={() => save('PENDING')}>{saving ? 'Saving…' : 'Reopen'}</button></section>}
    {view.data && !completed && <section className="simple-bin-editor">
      <div className="section-heading"><h2>Items</h2><button className="button button-secondary" type="button" disabled={locked} onClick={() => setRows((current) => [...current, blankItem()])}>Add</button></div>
      {!rows.length && <p className="muted">No items.</p>}
      <div className="item-list">{rows.map((row, index) => <fieldset className="item-row" key={row.localId} disabled={locked || completed}><legend>Item {index + 1}</legend><label className="span-2">Item Name<input value={row.itemName} maxLength="200" onChange={(event) => updateRow(row.localId, 'itemName', event.target.value)} required /></label><label>SKU <span className="optional">Optional</span><input value={row.sku} maxLength="100" onChange={(event) => updateRow(row.localId, 'sku', event.target.value)} placeholder="Leave blank if none" /></label><label>Quantity<input type="number" min="0" step="1" inputMode="numeric" value={row.quantity} onChange={(event) => updateRow(row.localId, 'quantity', event.target.value)} /></label><label className="span-2">Item Note <span className="optional">Optional</span><input value={row.memo} maxLength="1000" onChange={(event) => updateRow(row.localId, 'memo', event.target.value)} /></label><button type="button" className="button button-danger" onClick={() => setRows((current) => current.filter((item) => item.localId !== row.localId))}>Remove Item</button></fieldset>)}</div>
      <label>Note <span className="optional">Optional</span><textarea rows="3" maxLength="2000" value={statusMemo} disabled={locked} onChange={(event) => setStatusMemo(event.target.value)} /></label>
      <div className="bin-actions"><button className="button button-secondary button-large" disabled={locked || saving} onClick={() => save()}>{saving ? 'Saving…' : 'Save'}</button><button className="button button-success button-large" disabled={locked || saving} onClick={() => save('COMPLETED')}>{saving ? 'Saving…' : 'Mark Done'}</button></div>
    </section>}
    {view.data && !completed && <nav className="bin-step-nav" aria-label="Move between bins">{previousBin ? <Link className="button button-quiet" to={`/my-work/${assignedUnitId}/bin/${previousBin.id}`}>← Previous</Link> : <span />}{nextBin ? <Link className="button button-quiet" to={`/my-work/${assignedUnitId}/bin/${nextBin.id}`}>Next →</Link> : <Link className="button button-quiet" to={`/my-work/${assignedUnitId}`}>Back</Link>}</nav>}
  </>;
}
