import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Capacitor } from '@capacitor/core';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function Login() {
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If user is logged in, go to dashboard
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // Timeout fallback: if user comes back but app didn't catch the URL, reset after 45s
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setError('Login timed out. Please try again.');
    }, 45000);
    return () => clearTimeout(timer);
  }, [loading]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    const { error } = await signInWithGoogle();
    
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On native, we wait for the deep link listener to trigger onAuthStateChange
    // The useEffect above will navigate to /dashboard once the session is set
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ width: 120, height: 120, border: '3px solid #ef4444', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 48, boxShadow: '0 0 40px rgba(239,68,68,0.2)', marginBottom: 32 }}>
        LU
      </div>
      
      <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>LU CONNECT</h1>
      <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 800, letterSpacing: 4, marginBottom: 40 }}>ADMIN</div>
      <p style={{ color: '#6d7382', fontSize: 14, marginBottom: 40 }}>Authorized personnel only</p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '12px 20px', borderRadius: 12, fontSize: 14, marginBottom: 24, maxWidth: 300 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          background: '#1a1a1a', border: '1px solid #333', color: '#fff',
          padding: '16px 32px', borderRadius: 12, fontSize: 16, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 12, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, width: '100%', maxWidth: 300, justifyContent: 'center'
        }}
      >
        {loading ? 'Connecting...' : (
          <>
            <GoogleIcon /> Continue with Google
          </>
        )}
      </button>

      <div style={{ marginTop: 60, color: '#333', fontSize: 12 }}>by Samuel Mugasia</div>
    </div>
  );
}
