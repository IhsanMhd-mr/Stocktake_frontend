import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { LoadingState } from '../components/common.jsx';

export function ProtectedRoute() {
  const { user, restoring } = useAuth();
  const location = useLocation();
  if (restoring) return <main className="center-page"><LoadingState label="Restoring your session…" /></main>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

export function RoleRoute({ roles }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? <Outlet /> : <Navigate to={user?.role === 'USER' ? '/my-work' : '/dashboard'} replace />;
}

export function HomeRedirect() {
  const { user, restoring } = useAuth();
  if (restoring) return <main className="center-page"><LoadingState /></main>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'USER' ? '/my-work' : '/dashboard'} replace />;
}
