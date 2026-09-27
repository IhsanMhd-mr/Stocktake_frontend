import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

export function NotFoundPage() {
  const { user } = useAuth();
  return <main className="center-page"><div className="empty-state"><span className="eyebrow">404</span><h1>Page not found</h1><p>The page may have moved or no longer exists.</p><Link className="button button-primary" to={user?.role === 'USER' ? '/my-work' : '/dashboard'}>Return home</Link></div></main>;
}
