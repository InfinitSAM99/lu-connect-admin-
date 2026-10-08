import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setErr(error.message);
    else navigate('/dashboard');
  };

  return (
    <div className="login-shell">
      <form onSubmit={submit} className="login-card">
        <div className="login-brand">LU CONNECT</div>
        <div className="login-brand" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', letterSpacing: 2, marginBottom: 4 }}>
          ADMIN
        </div>
        <div className="login-sub">Authorized personnel only</div>

        {err && (
          <div
            style={{
              background: 'var(--danger-soft)',
              color: 'var(--brand)',
              padding: 10,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 14,
              border: '1px solid var(--brand)',
            }}
          >
            {err}
          </div>
        )}

        <div className="login-field">
          <input
            className="input"
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="login-field">
          <input
            className="input"
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button className="btn btn-primary login-submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
