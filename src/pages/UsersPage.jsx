import { useState } from 'react';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../components/common.jsx';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js';
import { useRefreshableData } from '../hooks/useRefreshableData.js';
import { useRealtime } from '../realtime/RealtimeContext.js';
import { usersApi } from '../api/users.api.js';
import { displayName } from '../utils/format.js';

function AccountForm({ saving, onSave, onCancel }) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('USER');
  const submit = (event) => {
    event.preventDefault();
    onSave({ username: username.trim(), pin, role, isActive: true });
  };
  return <form className="card form-panel management-form" onSubmit={submit}>
    <h2>Add Person</h2>
    <div className="form-grid"><label>Name<input autoComplete="off" required maxLength="100" pattern="[A-Za-z0-9._-]+" value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>PIN<input type="password" inputMode="numeric" autoComplete="new-password" required minLength="4" maxLength="12" pattern="[0-9]{4,12}" value={pin} onChange={(event) => setPin(event.target.value)} /></label><label>Access<select value={role} onChange={(event) => setRole(event.target.value)}><option value="USER">Worker</option><option value="ADMIN">Administrator</option></select></label></div>
    <div className="form-actions gap"><button type="button" className="button button-secondary" onClick={onCancel}>Back</button><button className="button button-primary" disabled={saving}>{saving ? 'Adding…' : 'Add'}</button></div>
  </form>;
}

function AccountCard({ account, busy, onToggle }) {
  const protectedAccount = account.role === 'SUPER_ADMIN';
  return <article className="account-card"><div><strong>{account.username}</strong><span>{displayName(account.role)}</span></div><StatusBadge value={account.isActive ? 'ACTIVE' : 'INACTIVE'} />{protectedAccount ? <small>Primary</small> : <button type="button" className={`button ${account.isActive ? 'button-danger' : 'button-secondary'}`} disabled={busy} onClick={() => onToggle(account)}>{account.isActive ? 'Disable' : 'Enable'}</button>}</article>;
}

export function UsersPage() {
  const view = useRefreshableData(usersApi.list, []);
  const { lastEvent } = useRealtime();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAccount, setPendingAccount] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [message, setMessage] = useState(null);
  useRealtimeRefresh(lastEvent, (event) => event.entityType === 'USER', view.refresh, 250);

  const create = async (payload) => {
    setSaving(true); setMutationError(null); setMessage(null);
    try { await usersApi.create(payload); setCreating(false); setMessage('✓ Person added'); await view.refresh(); }
    catch (error) { setMutationError(error); }
    finally { setSaving(false); }
  };
  const toggle = async () => {
    const account = pendingAccount;
    if (!account) return;
    setSaving(true); setMutationError(null); setMessage(null);
    try { await usersApi.update(account.id, { isActive: !account.isActive }); setMessage(account.isActive ? '✓ Disabled' : '✓ Enabled'); setPendingAccount(null); await view.refresh(); }
    catch (error) { setMutationError(error); }
    finally { setSaving(false); }
  };

  return <>
    <div className="page-heading minimal-heading"><h1>People</h1></div>
    {!creating && <div className="toolbar"><button type="button" className="button button-primary" onClick={() => { setCreating(true); setMutationError(null); }}>Add Person</button></div>}
    {creating && <AccountForm saving={saving} onSave={create} onCancel={() => setCreating(false)} />}
    {message && <div className="alert alert-info">{message}</div>}
    {mutationError && <div className="alert alert-error" role="alert">Could not save. Try again.</div>}
    {pendingAccount && <div className="inline-confirm account-confirm" role="dialog" aria-modal="true"><strong>{pendingAccount.isActive ? 'Disable' : 'Enable'} {pendingAccount.username}?</strong><button type="button" className="button button-secondary" disabled={saving} onClick={() => setPendingAccount(null)}>Back</button><button type="button" className={pendingAccount.isActive ? 'button button-danger' : 'button button-primary'} disabled={saving} onClick={toggle}>{pendingAccount.isActive ? 'Disable' : 'Enable'}</button></div>}
    {view.loading && <LoadingState label="Loading accounts…" />}
    {view.error && !view.data && <ErrorState error={view.error} onRetry={() => view.refresh().catch(() => {})} />}
    {view.error && view.data && <div className="alert alert-warning">Refresh failed. Showing the last successful account list.</div>}
    {view.data && !view.data.length && <EmptyState title="No people." />}
    <section className="account-list" aria-label="People">{view.data?.map((account) => <AccountCard key={account.id} account={account} busy={saving} onToggle={setPendingAccount} />)}</section>
  </>;
}
