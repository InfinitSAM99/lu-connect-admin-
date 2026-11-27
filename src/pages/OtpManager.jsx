import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheckIcon, MailIcon } from '../components/Icons.jsx';

export default function OtpManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setRequests(data || []);
      setLoading(false);
    };
    fetchRequests();

    const channel = supabase.channel('otp-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'otp_codes' }, (payload) => {
        setRequests((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const sendOtp = async (id, email) => {
    setSendingId(id);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 1. Save code to DB
    const { error: dbError } = await supabase
      .from('otp_codes')
      .update({ code, status: 'sent' })
      .eq('id', id);

    if (dbError) {
      setSendingId(null);
      return alert(dbError.message);
    }

    // 2. Trigger the Website API to send the email via Brevo
    try {
      const res = await fetch('https://lu-connect-website-sigma.vercel.app/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      if (!res.ok) throw new Error('Failed to send email');

      alert(`Email successfully sent to ${email}!`);
      setRequests((prev) => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(`Code generated (${code}) but email failed to send. Check Vercel logs.`);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ textAlign: 'center', padding: '20px 0 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <MailIcon width={64} height={64} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>OTP Manager</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Approve new device logins</p>
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading...</div>}
        
        {!loading && requests.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No pending OTP requests.</div>
        )}

        {requests.map(req => (
          <div key={req.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
              <ShieldCheckIcon width={18} height={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{req.email}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Requested: {new Date(req.created_at).toLocaleTimeString()}</div>
            </div>
            <button 
              onClick={() => sendOtp(req.id, req.email)}
              disabled={sendingId === req.id}
              style={{ 
                background: 'var(--brand)', 
                color: '#fff', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: 8, 
                fontWeight: 600, 
                cursor: sendingId === req.id ? 'wait' : 'pointer',
                opacity: sendingId === req.id ? 0.7 : 1
              }}
            >
              {sendingId === req.id ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
