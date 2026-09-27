import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { preparationApi } from '../api/preparation.api.js';
import { ErrorState, LoadingState } from '../components/common.jsx';
import { buildPrintLabels, calculateLabelGrid, collectPreparationBins, paginateLabels } from '../utils/print-labels.js';

const numberValue = (value) => Number.parseFloat(value);

export function BinLabelPrintPage() {
  const [zones, setZones] = useState([]);
  const [units, setUnits] = useState([]);
  const [preparation, setPreparation] = useState(null);
  const [zoneId, setZoneId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [startBinId, setStartBinId] = useState('');
  const [endBinId, setEndBinId] = useState('');
  const [orientation, setOrientation] = useState('portrait');
  const [suffixMode, setSuffixMode] = useState('none');
  const [labelWidth, setLabelWidth] = useState('6');
  const [labelHeight, setLabelHeight] = useState('3.5');
  const [margin, setMargin] = useState('1');
  const [showHeader, setShowHeader] = useState(false);
  const [headerHeight, setHeaderHeight] = useState('1.5');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    preparationApi.listZones().then((result) => setZones(result)).catch(setError).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUnits([]); setUnitId(''); setPreparation(null); setStartBinId(''); setEndBinId('');
    if (!zoneId) return;
    setLoading(true); setError(null);
    preparationApi.listUnits(zoneId).then(setUnits).catch(setError).finally(() => setLoading(false));
  }, [zoneId]);

  useEffect(() => {
    setPreparation(null); setStartBinId(''); setEndBinId('');
    if (!unitId) return;
    setLoading(true); setError(null);
    preparationApi.getPreparation(unitId).then((result) => {
      setPreparation(result);
      const bins = collectPreparationBins(result);
      setStartBinId(bins[0]?.id || '');
      setEndBinId(bins.at(-1)?.id || '');
    }).catch(setError).finally(() => setLoading(false));
  }, [unitId]);

  const allBins = useMemo(() => collectPreparationBins(preparation), [preparation]);
  const selectedBins = useMemo(() => {
    const start = allBins.findIndex((bin) => bin.id === startBinId);
    const end = allBins.findIndex((bin) => bin.id === endBinId);
    return start >= 0 && end >= start ? allBins.slice(start, end + 1) : [];
  }, [allBins, startBinId, endBinId]);
  const grid = calculateLabelGrid({
    orientation,
    marginCm: numberValue(margin),
    labelWidthCm: numberValue(labelWidth),
    labelHeightCm: numberValue(labelHeight),
    showHeader,
    headerHeightCm: numberValue(headerHeight)
  });
  const labels = useMemo(() => buildPrintLabels(selectedBins, suffixMode), [selectedBins, suffixMode]);
  const pages = grid.error ? [] : paginateLabels(labels, grid.labelsPerPage);
  const zone = zones.find((item) => item.id === zoneId);
  const unit = units.find((item) => item.id === unitId);
  const printStyle = grid.error ? {} : {
    '--print-page-width': `${grid.width}cm`,
    '--print-page-height': `${grid.height}cm`,
    '--print-margin': `${margin}cm`,
    '--label-width': `${labelWidth}cm`,
    '--label-height': `${labelHeight}cm`,
    '--label-columns': grid.columns,
    '--header-height': `${headerHeight}cm`
  };

  return <>
    <div className="no-print"><Link className="back-link" to="/dashboard">← Back</Link>
      <div className="page-heading minimal-heading"><h1>Print</h1></div>
      {loading && <LoadingState />}{error && <ErrorState error={error} />}
      <section className="card print-controls" aria-label="Bin label settings">
        <label>Zone<select value={zoneId} onChange={(event) => setZoneId(event.target.value)}><option value="">Select Zone</option>{zones.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
        <label>Rack / Basket<select value={unitId} disabled={!zoneId} onChange={(event) => setUnitId(event.target.value)}><option value="">Choose</option>{units.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
        <label>From<select value={startBinId} disabled={!allBins.length} onChange={(event) => setStartBinId(event.target.value)}><option value="">Choose</option>{allBins.map((bin) => <option key={bin.id} value={bin.id}>{bin.code}</option>)}</select></label>
        <label>To<select value={endBinId} disabled={!allBins.length} onChange={(event) => setEndBinId(event.target.value)}><option value="">Choose</option>{allBins.map((bin) => <option key={bin.id} value={bin.id}>{bin.code}</option>)}</select></label>
        <button type="button" className="button button-primary button-large" disabled={!pages.length} onClick={() => window.print()}>Print</button>
      </section>
      <button className="button button-secondary" type="button" onClick={() => setShowSettings((value) => !value)}>{showSettings ? 'Hide Settings' : 'Print Settings'}</button>
      {showSettings && <section className="card print-controls advanced-print"><label>Suffix<select value={suffixMode} onChange={(event) => setSuffixMode(event.target.value)}><option value="none">None</option><option value="start">START</option><option value="end">END</option><option value="both">Both</option></select></label><label>Orientation<select value={orientation} onChange={(event) => setOrientation(event.target.value)}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label>Label width (cm)<input type="number" min="0.5" step="0.1" value={labelWidth} onChange={(event) => setLabelWidth(event.target.value)} /></label><label>Label height (cm)<input type="number" min="0.5" step="0.1" value={labelHeight} onChange={(event) => setLabelHeight(event.target.value)} /></label><label>Page margin (cm)<input type="number" min="0" step="0.1" value={margin} onChange={(event) => setMargin(event.target.value)} /></label><label className="checkbox-label"><input type="checkbox" checked={showHeader} onChange={(event) => setShowHeader(event.target.checked)} /> Show header</label>{showHeader && <label>Header height (cm)<input type="number" min="0.5" step="0.1" value={headerHeight} onChange={(event) => setHeaderHeight(event.target.value)} /></label>}</section>}
      {grid.error && <div className="alert alert-error" role="alert">{grid.error}</div>}
      {!grid.error && unit && <div className="print-summary"><strong>{selectedBins.length} Bins</strong></div>}
    </div>
    {!loading && unit && !grid.error && !pages.length && <div className="no-print"><p className="empty-inline">Choose a valid start and end Bin.</p></div>}
    <div className={`print-preview ${orientation}`} style={printStyle} aria-label="A4 label preview">
      {pages.map((pageLabels, pageIndex) => <section className="print-page" key={pageIndex}>
        {showHeader && <header className="print-unit-header"><strong>{zone?.code} · {unit.code}</strong><span>{unit.unitType}</span></header>}
        <div className="print-label-grid">{pageLabels.map((label, index) => <article className="print-label" key={`${label.id}-${label.suffix || 'none'}-${index}`}>
          <span className="print-zone">{zone?.code}</span><strong className="print-bin-code">{label.code}{label.suffix ? ` ${label.suffix}` : ''}</strong><span className="print-unit-code">{unit.code}</span>{label.location && <small>{label.location}</small>}
        </article>)}</div>
      </section>)}
    </div>
  </>;
}
