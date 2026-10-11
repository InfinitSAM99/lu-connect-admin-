import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function LuLogo({ size = 120 }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <filter id="lu-admin-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#lu-admin-glow)">
        <rect x="14" y="14" width="172" height="172" rx="34"
          fill="none" stroke="var(--brand)" strokeWidth="5" />
        <path d="M 62 60 L 62 130 L 96 130"
          fill="none" stroke="#fff" strokeWidth="8"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60"
          fill="none" stroke="#fff" strokeWidth="8"
          strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

const MailIcon = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="m2 7 10 6 10-6" />
  </svg>
);

const LockIcon = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: '#000',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginBottom: 48 }}>
        <LuLogo size={120} />
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: 0.5, textAlign: 'center' }}>
          LU CONNECT
        </div>
        <div style={{ fontSize: 11, color: 'var(--brand)', letterSpacing: 2.4, fontWeight: 700, textTransform: 'uppercase' }}>
          Admin
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
          Authorized personnel only
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            width: '100%',
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            padding: '16px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign in
        </button>

        <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 40, letterSpacing: 0.4 }}>
          by Samuel Mugasia
        </div>
      </div>

      {sheetOpen && (
        <>
          <div
            onClick={() => setSheetOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 300,
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '85vh',
              background: 'var(--surface)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              zIndex: 310,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'drawer-slide-up 250ms ease-out',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '10px 0 6px',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.35)',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto' }}>
        <form onSubmit={submit} style={{ padding: '4px 20px 32px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 6 }}>
            Admin sign in
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', marginBottom: 24 }}>
            Enter your credentials to continue
          </div>

          {err && (
            <div
              style={{
                background: 'rgba(239,68,68,0.14)',
                color: 'var(--brand)',
                padding: 12,
                borderRadius: 12,
                fontSize: 13,
                marginBottom: 14,
                lineHeight: 1.4,
              }}
            >
              {err}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--surface-2)',
              borderRadius: 16,
              padding: '4px 16px',
              marginBottom: 14,
            }}
          >
            <span style={{ display: 'flex', color: 'var(--text-3)', flexShrink: 0 }}><MailIcon /></span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              autoComplete="email"
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 15,
                padding: '16px 0',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--surface-2)',
              borderRadius: 16,
              padding: '4px 16px',
              marginBottom: 24,
            }}
          >
            <span style={{ display: 'flex', color: 'var(--text-3)', flexShrink: 0 }}><LockIcon /></span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 15,
                padding: '16px 0',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--brand)',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              padding: '16px',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
