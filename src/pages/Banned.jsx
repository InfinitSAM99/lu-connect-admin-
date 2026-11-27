import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Banned() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#000', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{
        width: 96, height: 96, borderRadius: 48,
        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
      }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
          stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 12 }}>
        Access Revoked
      </h1>
      <p style={{ color: '#6d7382', fontSize: 15, lineHeight: 1.6, maxWidth: 340, marginBottom: 8 }}>
        Your access to <span style={{ color: '#fff', fontWeight: 600 }}>LU CONNECT</span> has been revoked.
      </p>
      <p style={{ color: '#6d7382', fontSize: 13, lineHeight: 1.6, maxWidth: 340, marginBottom: 40 }}>
        If you believe this is a mistake, contact support.
      </p>
      <button
        onClick={handleSignOut}
        style={{
          background: '#ef4444', color: '#fff', border: 'none',
          padding: '16px 40px', borderRadius: 12, fontSize: 15, fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Back to Login
      </button>
    </div>
  );
}
