import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bot state
  const [botEnabled, setBotEnabled] = useState(false);
  const [botFrequency, setBotFrequency] = useState(10);
  const [botReplyEnabled, setBotReplyEnabled] = useState(true);
  const [botDmEnabled, setBotDmEnabled] = useState(true);
  const [botBusy, setBotBusy] = useState(false);
  const [botSaved, setBotSaved] = useState(false);

  // Bot stats
  const [botCount, setBotCount] = useState(0);
  const [botPostsToday, setBotPostsToday] = useState(0);
  const [botLastTick, setBotLastTick] = useState(null);

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

    const { data: botCfg } = await supabase
      .from('bot_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (botCfg) {
      setBotEnabled(!!botCfg.enabled);
      setBotFrequency(botCfg.post_frequency_minutes || 10);
      setBotReplyEnabled(botCfg.reply_enabled !== false);
      setBotDmEnabled(botCfg.dm_enabled !== false);
    }

    // Stats
    const { count: bots } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_bot', true);
    setBotCount(bots || 0);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: botIds } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_bot', true);
    const ids = (botIds || []).map((b) => b.id);
    if (ids.length > 0) {
      const { count: todayPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .in('author_id', ids)
        .gte('created_at', since);
      setBotPostsToday(todayPosts || 0);
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

  const bringAllBotsOnline = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('is_bot', true);
    if (error) console.error('Could not bring bots online:', error.message);
  };

  const toggleBots = async () => {
    setBotBusy(true);
    const next = !botEnabled;
    const { error } = await supabase
      .from('bot_config')
      .update({ enabled: next, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) { alert('Failed: ' + error.message); setBotBusy(false); return; }
    setBotEnabled(next);
    if (next) await bringAllBotsOnline();
    setBotBusy(false);
    setBotSaved(true);
    setTimeout(() => setBotSaved(false), 2000);
  };

  const saveBotFrequency = async () => {
    const freq = Math.max(1, Math.min(120, Number(botFrequency) || 10));
    setBotBusy(true);
    const { error } = await supabase
      .from('bot_config')
      .update({ post_frequency_minutes: freq, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setBotBusy(false);
    if (error) { alert('Failed: ' + error.message); return; }
    setBotFrequency(freq);
    setBotSaved(true);
    setTimeout(() => setBotSaved(false), 2000);
  };

  const toggleBotReply = async () => {
    const next = !botReplyEnabled;
    setBotReplyEnabled(next);
    const { error } = await supabase
      .from('bot_config')
      .update({ reply_enabled: next, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) { alert('Failed: ' + error.message); setBotReplyEnabled(!next); return; }
    setBotSaved(true);
    setTimeout(() => setBotSaved(false), 2000);
  };

  const toggleBotDm = async () => {
    const next = !botDmEnabled;
    setBotDmEnabled(next);
    const { error } = await supabase
      .from('bot_config')
      .update({ dm_enabled: next, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) { alert('Failed: ' + error.message); setBotDmEnabled(!next); return; }
    setBotSaved(true);
    setTimeout(() => setBotSaved(false), 2000);
  };

  const runBotTickNow = async () => {
    setBotBusy(true);
    try {
      const { data: json, error: fnErr } = await supabase.functions.invoke('bot-tick', {
        body: {},
      });
      if (fnErr) throw fnErr;
      alert('Tick ran: ' + JSON.stringify(json.actions || json, null, 2));
      await load();
    } catch (e) {
      alert('Tick failed: ' + e.message);
    } finally {
      setBotBusy(false);
    }
  };

  if (loading) return <div className="state">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">App configuration and controls</p>
      </div>

      {/* MAINTENANCE */}
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

      {/* BOT ACTIVITY */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 16,
          borderLeft: botEnabled ? '4px solid #22c55e' : '4px solid #6b7280',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
              Bot Activity
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>
              {botEnabled
                ? `🟢 ${botCount} bots are ACTIVE — posting and staying online.`
                : `⚪ ${botCount} bots are idle — no auto activity.`}
            </div>
            {botSaved && (
              <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 8, fontWeight: 600 }}>
                ✓ Saved
              </div>
            )}
          </div>
          <button
            onClick={toggleBots}
            disabled={botBusy}
            style={{
              minWidth: 130,
              padding: '12px 22px',
              borderRadius: 10,
              border: 0,
              background: botEnabled ? '#ef4444' : '#22c55e',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: botBusy ? 'wait' : 'pointer',
            }}
          >
            {botBusy ? '…' : botEnabled ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          <Stat label="Total bots" value={botCount} />
          <Stat label="Bot posts (24h)" value={botPostsToday} />
          <Stat label="Post interval" value={`${botFrequency} min`} />
        </div>

        {botEnabled && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Post frequency (minutes between posts)
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="input"
                type="number"
                min="1"
                max="120"
                value={botFrequency}
                onChange={(e) => setBotFrequency(e.target.value)}
                style={{ width: 100 }}
              />
              <button className="btn btn-primary" onClick={saveBotFrequency} disabled={botBusy}>
                Save
              </button>
              <button className="btn" onClick={runBotTickNow} disabled={botBusy}>
                Run tick now
              </button>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              <TogglePill label="Reply to comments" on={botReplyEnabled} onClick={toggleBotReply} />
              <TogglePill label="Reply to DMs" on={botDmEnabled} onClick={toggleBotDm} />
            </div>
          </div>
        )}
      </div>

      {/* COMING SOON */}
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

function Stat({ label, value }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      borderRadius: 10,
      padding: '12px 16px',
      minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function TogglePill({ label, on, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: on ? 'rgba(34,197,94,0.15)' : 'var(--surface-2)',
        color: 'var(--text)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      <span style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: on ? '#22c55e' : '#6b7280',
      }} />
      {label}
      <span style={{ marginLeft: 'auto', color: on ? '#22c55e' : 'var(--text-3)', fontSize: 11, fontWeight: 700 }}>
        {on ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}
