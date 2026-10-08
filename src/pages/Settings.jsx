import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('maintenance_mode, maintenance_message')
      .eq('id', 1)
      .maybeSingle();
    if (data) {
      setMaintenance(!!data.maintenance_mode);
      setMessage(data.maintenance_message || 'LU CONNECT is under maintenance. We will be back soon.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleMaintenance = async () => {
    setBusy(true);
    const next = !maintenance;
    const { error } = await supabase
      .from('app_settings')
      .update({ maintenance_mode: next, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setBusy(false);
    if (error) { alert('Failed: ' + error.message); return; }
    setMaintenance(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveMessage = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('app_settings')
      .update({ maintenance_message: message, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setBusy(false);
    if (error) { alert('Failed: ' + error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="state">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">App configuration and controls</p>
      </div>

      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 16,
          borderLeft: maintenance ? '4px solid #ef4444' : '4px solid #22c55e',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
              Maintenance Mode
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>
              {maintenance
                ? '🔴 App is BLOCKED for all users.'
                : '🟢 App is live — everyone can access it.'}
            </div>
            {saved && (
              <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 8, fontWeight: 600 }}>
                ✓ Saved
              </div>
            )}
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={busy}
            style={{
              minWidth: 130,
              padding: '12px 22px',
              borderRadius: 10,
              border: 0,
              background: maintenance ? '#22c55e' : '#ef4444',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? '…' : maintenance ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>

        {maintenance && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Message shown to users
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                className="input"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ flex: 1, minWidth: 220 }}
              />
              <button className="btn btn-primary" onClick={saveMessage} disabled={busy}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Placeholder cards for future settings */}
      <div className="card" style={{ padding: 20, marginBottom: 16, opacity: 0.5 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>
          Coming soon
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>
          Feature flags · App version · Support contact · Bulk notification sender
        </div>
      </div>
    </div>
  );
}
