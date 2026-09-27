import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

export function LoginPage() {
  const { user, restoring, login } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!restoring && user) return <Navigate to={user.role === 'USER' ? '/my-work' : '/dashboard'} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const verifiedUser = await login({ username, pin });
      const requested = location.state?.from?.pathname;
      const permittedRequested = requested && (verifiedUser.role === 'USER' ? requested.startsWith('/my-work') : !requested.startsWith('/my-work'));
      navigate(permittedRequested ? requested : verifiedUser.role === 'USER' ? '/my-work' : '/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError);
    } finally { setSubmitting(false); }
  };

  return (
    <main className="login-page">
      <section className="login-intro"><span className="brand-mark large">S</span><h1>Stockroom</h1></section>
      <section className="login-card">
        <div><h2>Login</h2></div>
        {error && <div className="alert alert-error" role="alert">Could not sign in.</div>}
        <form onSubmit={submit}>
          <label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required autoFocus /></label>
          <label>PIN<div className="pin-input-row"><input id="login-pin" type={showPin ? 'text' : 'password'} inputMode="numeric" autoComplete="current-password" value={pin} onChange={(event) => setPin(event.target.value)} required /><button type="button" className="button button-secondary" aria-controls="login-pin" aria-pressed={showPin} onClick={() => setShowPin((visible) => !visible)}>{showPin ? 'Hide' : 'Show'}</button></div></label>
          <button className="button button-primary button-wide" disabled={submitting}>{submitting ? 'Loading…' : 'Login'}</button>
        </form>
      </section>
    </main>
  );
}
