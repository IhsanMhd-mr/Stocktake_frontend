import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { preparationApi } from '../api/preparation.api.js';
import { stockTakeApi } from '../api/stock-take.api.js';
import { teamAssignmentApi } from '../api/team-assignment.api.js';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../components/common.jsx';
import { useRefreshableData } from '../hooks/useRefreshableData.js';

const newRange = (from = 1, to = 1) => ({ key: crypto.randomUUID(), from, to });

function unitBins(detail) {
  return detail?.unitType === 'RACK'
    ? (detail.structure?.sides || []).flatMap((side) => side.bins || [])
    : detail?.structure?.bins || [];
}

function compressRanges(bins) {
  const numbers = [...new Set(bins.map((bin) => Number(bin.binNumber)))].sort((a, b) => a - b);
  const ranges = [];
  for (const number of numbers) {
    const last = ranges.at(-1);
    if (last && number === last.to + 1) last.to = number;
    else ranges.push(newRange(number, number));
  }
  return ranges;
}

export function NewAssignedUnitPage() {
  const navigate = useNavigate();
  const zonesView = useRefreshableData(preparationApi.listZones, []);
  const [zoneId, setZoneId] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!zoneId && zonesView.data?.length) setZoneId(zonesView.data[0].id);
  }, [zoneId, zonesView.data]);

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const draft = await teamAssignmentApi.create({ assignedUnitName: name.trim() || null, zoneId });
      navigate(`/assigned-units/${draft.id}/edit`, { replace: true });
    } catch (createError) {
      setError(createError);
    } finally {
      setSaving(false);
    }
  };

  return <>
    <Link className="back-link" to="/assigned-units">← Work</Link>
    <div className="page-heading minimal-heading"><h1>Where is the work?</h1></div>
    {zonesView.loading && <LoadingState />}
    {zonesView.error && !zonesView.data && <ErrorState error={zonesView.error} onRetry={() => zonesView.refresh().catch(() => {})} />}
    {error && <div className="alert alert-error">{error.message}</div>}
    {zonesView.data && !zonesView.data.length && <EmptyState title="No Zones available" />}
    {!!zonesView.data?.length && <form className="builder-section" onSubmit={create}>
      <div className="form-grid">
        <label>Zone<select value={zoneId} required onChange={(event) => setZoneId(event.target.value)}>{zonesView.data.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
        <label>Name <span className="optional">Optional</span><input maxLength="150" value={name} onChange={(event) => setName(event.target.value)} /></label>
      </div>
      <div className="form-actions"><button className="button button-primary button-large" disabled={saving}>{saving ? 'Loading…' : 'Next'}</button></div>
    </form>}
  </>;
}

async function loadBuilder(assignedUnitId) {
  const [assignment, allUnits, leaders] = await Promise.all([
    teamAssignmentApi.get(assignedUnitId),
    stockTakeApi.getUnits(),
    teamAssignmentApi.eligibleLeaders(),
  ]);
  const zoneUnits = allUnits.filter((unit) => unit.zone?.id === assignment.zone?.id);
  const units = await Promise.all(zoneUnits.map(async (unit) => ({ ...unit, detail: await stockTakeApi.getUnit(unit.id) })));
  return { assignment, units, leaders };
}

function RangeEditor({ unit, ranges, disabled, onChange }) {
  const bins = unitBins(unit.detail);
  const max = Math.max(1, ...bins.map((bin) => Number(bin.binNumber)));
  const update = (key, field, value) => onChange(ranges.map((range) => range.key === key ? { ...range, [field]: value } : range));
  return <div className={`range-unit ${disabled ? 'disabled' : ''}`}>
    <div className="range-list">{ranges.map((range) => <div className="range-row" key={range.key}>
      <label>From<input type="number" min="1" max={max} value={range.from} disabled={disabled} onChange={(event) => update(range.key, 'from', event.target.value)} /></label>
      <label>To<input type="number" min="1" max={max} value={range.to} disabled={disabled} onChange={(event) => update(range.key, 'to', event.target.value)} /></label>
      <button type="button" className="button button-quiet" disabled={disabled} onClick={() => onChange(ranges.filter((item) => item.key !== range.key))}>Remove</button>
    </div>)}</div>
    <button type="button" className="button button-secondary" disabled={disabled} onClick={() => onChange([...ranges, newRange()])}>Add Range</button>
  </div>;
}

export function AssignedUnitBuilderPage() {
  const { assignedUnitId } = useParams();
  const navigate = useNavigate();
  const view = useRefreshableData(() => loadBuilder(assignedUnitId), [assignedUnitId]);
  const [ranges, setRanges] = useState({});
  const [leaderId, setLeaderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const assignment = view.data?.assignment;
  const draft = assignment?.lifecycleStatus === 'DRAFT';

  useEffect(() => {
    if (!view.data) return;
    const restored = {};
    for (const physicalUnit of view.data.assignment.physicalUnits) restored[physicalUnit.id] = compressRanges(physicalUnit.bins);
    setRanges(restored);
    setLeaderId(view.data.assignment.leader?.id || view.data.leaders[0]?.id || '');
  }, [view.data]);

  const selectedUnits = useMemo(() => (view.data?.units || []).filter((unit) => ranges[unit.id]), [view.data, ranges]);
  const total = useMemo(() => selectedUnits.reduce((sum, unit) => {
    const selectedIds = new Set();
    for (const range of ranges[unit.id] || []) {
      const from = Number(range.from);
      const to = Number(range.to);
      unitBins(unit.detail).filter((bin) => bin.binNumber >= from && bin.binNumber <= to).forEach((bin) => selectedIds.add(bin.id));
    }
    return sum + selectedIds.size;
  }, 0), [selectedUnits, ranges]);

  const mutate = async (work, success) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await work();
      await view.refresh();
      setMessage(success);
    } catch (mutationError) {
      setError(mutationError);
      await view.refresh().catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  const toggleUnit = (unit) => setRanges((current) => {
    const next = { ...current };
    if (next[unit.id]) delete next[unit.id];
    else next[unit.id] = [newRange(1, Math.max(1, ...unitBins(unit.detail).map((bin) => bin.binNumber)))];
    return next;
  });

  const selectionsForSave = () => {
    const selections = selectedUnits.flatMap((unit) => (ranges[unit.id] || []).map((range) => ({
      unitId: unit.id,
      fromBinNumber: Number(range.from),
      toBinNumber: Number(range.to),
    })));
    if (!selections.length) { setError(new Error('Choose at least one Rack or Basket.')); return null; }
    if (selections.some((range) => !Number.isInteger(range.fromBinNumber) || !Number.isInteger(range.toBinNumber) || range.fromBinNumber < 1 || range.fromBinNumber > range.toBinNumber)) {
      setError(new Error('Check the Bin numbers.'));
      return null;
    }
    for (const unit of selectedUnits) {
      const ordered = (ranges[unit.id] || []).map((range) => [Number(range.from), Number(range.to)]).sort((a, b) => a[0] - b[0]);
      if (ordered.some((range, index) => index > 0 && range[0] <= ordered[index - 1][1])) {
        setError(new Error(`${unit.code} has overlapping ranges.`));
        return null;
      }
    }
    return selections;
  };

  const assignWork = async () => {
    const selections = selectionsForSave();
    if (!selections) return;
    if (!leaderId) { setError(new Error('Choose a person.')); return; }
    setSaving(true);
    setError(null);
    try {
      await teamAssignmentApi.replaceBins(assignedUnitId, { version: assignment.version, selections });
      let latest = await teamAssignmentApi.get(assignedUnitId);
      await teamAssignmentApi.activate(assignedUnitId, latest.version);
      latest = await teamAssignmentApi.get(assignedUnitId);
      await teamAssignmentApi.assignLeader(assignedUnitId, leaderId, latest.version);
      navigate(`/assigned-units/${assignedUnitId}`, { replace: true });
    } catch (assignError) {
      setError(assignError);
      await view.refresh().catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  return <>
    <Link className="back-link" to="/assigned-units">← Work</Link>
    <div className="page-heading minimal-heading"><h1>{draft ? 'Choose Rack or Basket' : (assignment?.assignedUnitName || 'Work')}</h1></div>
    {view.loading && <LoadingState />}
    {view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}
    {message && <div className="alert alert-info">{message}</div>}
    {error && <div className="alert alert-error" role="alert">{error.message}</div>}
    {view.data && <div className="builder-stack">
      <section className="card builder-section">
        <h2>{assignment.zone?.name || 'Zone'}</h2>
        {!view.data.units.length && <EmptyState title="No Racks or Baskets ready" />}
        <div className="unit-choice-grid">{view.data.units.map((unit) => {
          const disabled = unit.stockTakeStatus === 'COMPLETED' || !draft;
          return <div key={unit.id}>
            <label className={`unit-choice ${disabled ? 'disabled' : ''}`}>
              <input type="checkbox" checked={Boolean(ranges[unit.id])} disabled={disabled} onChange={() => toggleUnit(unit)} />
              <span><strong>{unit.name || unit.code}</strong><small>{unit.progress?.totalBins || unitBins(unit.detail).length} Bins</small></span>
            </label>
            {ranges[unit.id] && <RangeEditor unit={unit} ranges={ranges[unit.id]} disabled={disabled} onChange={(next) => setRanges((current) => ({ ...current, [unit.id]: next }))} />}
          </div>;
        })}</div>
      </section>
      <section className="card builder-section">
        <h2>{total} Bins selected</h2>
        {!view.data.leaders.length ? <EmptyState title="No workers available" /> : <label>Person<select value={leaderId} onChange={(event) => setLeaderId(event.target.value)}>{view.data.leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.username}</option>)}</select></label>}
        {draft && <button className="button button-primary button-large" disabled={saving || !leaderId || !total} onClick={assignWork}>{saving ? 'Assigning…' : 'Assign Work'}</button>}
      </section>
      {!draft && <section className="card builder-section">
        <div className="inline-badges"><StatusBadge value={assignment.lifecycleStatus} /><strong>{assignment.leader?.username || 'Unassigned'}</strong></div>
        <div className="card-actions">
          <button className="button button-primary" disabled={saving || !leaderId} onClick={() => mutate(() => assignment.leader ? teamAssignmentApi.reassignLeader(assignedUnitId, leaderId, assignment.version) : teamAssignmentApi.assignLeader(assignedUnitId, leaderId, assignment.version), 'Saved.')}>Save Person</button>
          {assignment.leader && (confirming === 'unassign'
            ? <div className="inline-confirm"><span>Remove {assignment.leader.username}?</span><button className="button button-secondary" onClick={() => setConfirming(null)}>Cancel</button><button className="button button-danger" disabled={saving} onClick={() => { setConfirming(null); mutate(() => teamAssignmentApi.unassignLeader(assignedUnitId, assignment.version), 'Removed.'); }}>Confirm</button></div>
            : <button className="button button-danger" disabled={saving} onClick={() => setConfirming('unassign')}>Remove</button>)}
          <button className="button button-secondary" onClick={() => navigate(`/assigned-units/${assignedUnitId}`)}>Open</button>
        </div>
      </section>}
      {draft && <section className="draft-danger">{confirming === 'delete'
        ? <div className="inline-confirm"><span>Delete this draft?</span><button className="button button-secondary" onClick={() => setConfirming(null)}>Cancel</button><button className="button button-danger" disabled={saving} onClick={() => { setConfirming(null); setSaving(true); teamAssignmentApi.deleteDraft(assignedUnitId, assignment.version).then(() => navigate('/assigned-units', { replace: true })).catch(setError).finally(() => setSaving(false)); }}>Delete</button></div>
        : <button className="button button-danger" onClick={() => setConfirming('delete')}>Delete Draft</button>}
      </section>}
    </div>}
  </>;
}
