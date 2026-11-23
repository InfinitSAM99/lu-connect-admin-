import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheckIcon } from '../components/Icons.jsx';

export default function RecoveryMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (!error) setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleApprove = async (item) => {
    try {
      const { data: bannedData } = await supabase
        .from('banned_devices')
        .select('device_id')
        .eq('email', item.email)
        .maybeSingle();

      if (bannedData) {
        const { data: accountId, error } = await supabase.rpc('admin_resolve_device_ban', {
          p_device_id: bannedData.device_id,
          p_user_email: item.email
        });

        if (error) throw error;

        await supabase.from('admin_messages').update({ is_read: true }).eq('id', item.id);

        alert(`Device Unbanned!\nAccount ID for ${item.email}:\n\n${accountId || 'No pattern set.'}\n\n(Copied to clipboard)`);

        if (accountId) {
          navigator.clipboard.writeText(accountId);
        }

        fetchMessages();
      } else {
        alert('No banned device found for this email.');
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px' }}>
      {/* EXACT NATIVE HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottom: '1px solid #1f1f1f',
        marginBottom: 16,
      }}>
        {/* Back button (native arrow-back) */}
        <button
          onClick={() => window.history.back()}
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', padding: 0,
          }}
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <h1 style={{
          color: '#fff',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 2,
          textTransform: 'uppercase',
          margin: 0,
        }}>
          Recovery Messages
        </h1>

        <div style={{ width: 40 }} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid #1f1f1f',
            borderTopColor: '#ef4444',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : messages.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 60 }}>
          <ShieldCheckIcon width={64} height={64} color="#1f1f1f" />
          <div style={{ color: '#6d7382', marginTop: 20 }}>No pending messages.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map(item => (
            <div key={item.id} style={{
              backgroundColor: '#0a0a0a',
              borderRadius: 12,
              border: '1px solid #1f1f1f',
              padding: 16,
            }}>
              {/* Email */}
              <div style={{ color: '#ef4444', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                {item.email}
              </div>

              {/* Details */}
              <div style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>
                <span style={{ color: '#6d7382', fontSize: 12 }}>ADM:</span> {item.admission_number}
              </div>
              <div style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>
                <span style={{ color: '#6d7382', fontSize: 12 }}>DOB:</span> {item.dob}
              </div>
              <div style={{ color: '#fff', fontSize: 14, marginBottom: 4 }}>
                <span style={{ color: '#6d7382', fontSize: 12 }}>UNI:</span> {item.university_name}
              </div>

              {/* Message */}
              <div style={{ color: '#6d7382', fontSize: 14, fontStyle: 'italic', marginTop: 12, marginBottom: 16, lineHeight: '20px' }}>
                "{item.message}"
              </div>

              {/* Approve Button */}
              <button
                onClick={() => handleApprove(item)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#22c55e',
                  color: '#fff',
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: 1.5,
                  cursor: 'pointer',
                }}
              >
                <ShieldCheckIcon width={18} height={18} color="#fff" />
                VERIFY & UNBAN
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
