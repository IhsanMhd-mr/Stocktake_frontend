import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { useRealtime } from '../realtime/RealtimeContext.js';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { connected } = useRealtime();
  const navigate = useNavigate();
  const admin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to={admin ? '/dashboard' : '/my-work'}><span className="brand-mark">S</span><span>Stockroom</span></NavLink>
        <nav aria-label="Primary navigation">
          {admin ? <><NavLink to="/preparation">Prepare</NavLink><NavLink to="/assigned-units">Assign Work</NavLink><NavLink to="/monitor">Monitor</NavLink>{user.role === 'SUPER_ADMIN' && <NavLink to="/users">People</NavLink>}<NavLink to="/print/bin-labels">Print</NavLink></> : <><NavLink to="/my-work">My Work</NavLink><NavLink to="/help">Help</NavLink></>}
        </nav>
        <div className="account-block">{admin && <span className={`live-state ${connected ? 'online' : ''}`}>{connected ? 'Live' : 'Offline'}</span>}<span className="account-name">{user.username}</span><button className="button button-quiet" onClick={signOut}>Logout</button></div>
      </header>
      <main className="page"><Outlet /></main>
    </div>
  );
}
