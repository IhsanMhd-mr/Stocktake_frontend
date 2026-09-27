import { displayName, formatDateTime } from '../utils/format.js';

export function StatusBadge({ value }) {
  const tone = ['COMPLETED', 'DONE', 'ACTIVE'].includes(value) ? 'success'
    : ['RECHECK'].includes(value) ? 'danger'
      : ['IN_PROGRESS'].includes(value) ? 'info' : 'neutral';
  return <span className={`status-badge status-${tone}`}>{displayName(value)}</span>;
}

export function ProgressBar({ progress }) {
  const percent = Math.min(100, Math.max(0, Number(progress?.progressPercent || 0)));
  return <div className="progress-group">
    <div className="progress-label"><span>{progress?.completedBins || 0} of {progress?.totalBins || 0} bins</span><strong>{percent}%</strong></div>
    <div className="progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${percent}%` }} /></div>
  </div>;
}

export function RefreshButton({ onClick, refreshing }) {
  return <button type="button" className="button button-secondary" onClick={onClick} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>;
}

export function LastRefreshed({ value }) {
  return <span className="last-refreshed">Last refreshed: {formatDateTime(value)}</span>;
}

export function LoadingState({ label = 'Loading…' }) {
  return <div className="state-panel" role="status"><span className="spinner" />{label}</div>;
}

export function ErrorState({ error, onRetry }) {
  return <div className="alert alert-error" role="alert"><strong>{error?.message || 'Could not load.'}</strong>{onRetry && <button className="button button-secondary" onClick={onRetry}>Try Again</button>}</div>;
}

export function EmptyState({ title, children }) {
  return <div className="empty-state"><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}
