import { useNavigate } from 'react-router-dom';

export default function NotAuthorized() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 40,
        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </div>
      <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
        Not Authorized
      </h2>
      <p style={{ color: '#6d7382', fontSize: 14, maxWidth: 320, marginBottom: 28 }}>
        You don't have permission to view this page.
      </p>
      <button
        onClick={() => navigate('/dashboard', { replace: true })}
        style={{
          background: '#1a1a1a', color: '#fff', border: '1px solid #333',
          padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
