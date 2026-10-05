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
    setErr(''); setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setErr(error.message);
    else navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 400, padding: 28 }}>
        <div className="brand" style={{ fontSize: 22, textAlign: 'center', marginBottom: 6 }}>LU CONNECT Admin</div>
        <p style={{ textAlign: 'center', color: 'var(--text-2)', marginTop: 0, marginBottom: 24, fontSize: 13 }}>
          Authorized personnel only
        </p>

        {err && <div style={{ background: 'var(--brand-soft)', color: 'var(--brand)', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 10 }} />
        <input className="input" type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 16 }} />

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}