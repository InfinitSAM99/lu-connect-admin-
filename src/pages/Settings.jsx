import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  ShieldIcon, XIcon,
} from '../components/Icons.jsx';

const SECTIONS = [
  {
    title: 'App control',
    rows: [
      { key: 'maintenance',    label: 'Maintenance mode',      desc: 'Block all users from the app',  type: 'toggle' },
      { key: 'maintenance_message', label: 'Maintenance message', desc: 'Shown to users when blocked', type: 'text' },
      { key: 'min_app_version', label: 'Minimum app version',  desc: 'Force users to update',        type: 'text' },
    ],
  },
  {
    title: 'Bot activity',
    rows: [
      { key: 'bots_enabled',    label: 'Bots enabled',       desc: 'Master switch for all bot activity', type: 'toggle' },
      { key: 'post_frequency_minutes', label: 'Post interval', desc: 'Minutes between bot posts',         type: 'number' },
      { key: 'reply_posts_enabled',  label: 'Reply to posts',     desc: 'Bots comment on user posts',       type: 'toggle' },
      { key: 'reply_enabled',        label: 'Reply to comments',  desc: 'Bots reply to user comments',      type: 'toggle' },
      { key: 'dm_enabled',           label: 'Reply to DMs',       desc: 'Bots respond to direct messages',  type: 'toggle' },
      { key: 'daily_post_limit',     label: 'Daily post limit',   desc: 'Max bot posts per day',            type: 'number' },
      { key: 'daily_comment_limit',  label: 'Daily comment limit', desc: 'Max bot comments per day',         type: 'number' },
      { key: 'run_tick',             label: 'Run bot tick now',   desc: 'Trigger bot activity manually',    type: 'action' },
    ],
  },
  {
    title: 'Moderation',
    rows: [
      { key: 'ai_moderation_enabled', label: 'AI moderation',      desc: 'Auto-flag inappropriate content',  type: 'toggle' },
      { key: 'auto_approve_signups',  label: 'Auto-approve signups', desc: 'Skip manual approval of new users', type: 'toggle' },
    ],
  },
  {
    title: 'Boosts',
    rows: [
      { key: 'boosts_enabled',   label: 'Boosts enabled',      desc: 'Allow students to buy boosts',  type: 'toggle' },
      { key: 'boost_auto_approve', label: 'Auto-approve boosts', desc: 'Start delivery without review', type: 'toggle' },
    ],
  },
  {
    title: 'Feature flags',
    rows: [
      { key: 'feature_video',        label: 'Video tab',      desc: 'Show the video section in the app', type: 'toggle' },
      { key: 'feature_events',       label: 'Events',         desc: 'Show events in the app',            type: 'toggle' },
      { key: 'feature_groups',       label: 'Groups',         desc: 'Show groups in the app',            type: 'toggle' },
      { key: 'feature_ai_assistant', label: 'AI Assistant',   desc: 'Show LU CONNECT Assistant',         type: 'toggle' },
    ],
  },
  {
    title: 'Notifications',
    rows: [
      { key: 'welcome_notification', label: 'Welcome notification', desc: 'Send a welcome message to new users', type: 'toggle' },
    ],
  },
];

export default function Settings() {
  const [app, setApp] = useState(null);
  const [bot, setBot] = useState(null);
  const [botCount, setBotCount] = useState(0);
  const [botPostsToday, setBotPostsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const { data: appData } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    setApp(appData || {});

    const { data: botData } = await supabase
      .from('bot_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    setBot(botData || {});

    const { count: bc } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_bot', true);
    setBotCount(bc || 0);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: botIds } = await supabase.from('profiles').select('id').eq('is_bot', true);
    const ids = (botIds || []).map((b) => b.id);
    if (ids.length > 0) {
      const { count: tp } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .in('author_id', ids)
        .gte('created_at', since);
      setBotPostsToday(tp || 0);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const onTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    activeRef.current = true;
  };
  const onTouchMove = (e) => {
    if (!activeRef.current) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 100) setActive(null);
    setDragY(0);
    activeRef.current = false;
  };

  const openRow = (row) => {
    setActive(row);
    setDragY(0);
    if (row.type === 'toggle') setDraft(!!getValue(row.key));
    else if (row.type === 'number') setDraft(String(getValue(row.key) ?? ''));
    else setDraft(String(getValue(row.key) ?? ''));
  };

  const getValue = (key) => {
    const botKeys = ['bots_enabled','post_frequency_minutes','reply_posts_enabled','reply_enabled','dm_enabled','daily_post_limit','daily_comment_limit'];
    if (botKeys.includes(key)) {
      if (key === 'bots_enabled') return bot.enabled;
      return bot[key];
    }
    return app?.[key];
  };

  const saveToggle = async (key, next) => {
    setBusy(true);
    const botKeys = ['bots_enabled','reply_posts_enabled','reply_enabled','dm_enabled'];
    if (botKeys.includes(key)) {
      const field = key === 'bots_enabled' ? 'enabled' : key;
      const { error } = await supabase
        .from('bot_config')
        .update({ [field]: next, updated_at: new Date().toISOString() })
        .eq('id', 1);
      setBusy(false);
      if (error) { alert('Failed: ' + error.message); return; }
      setBot((b) => ({ ...b, [field]: next }));
      if (field === 'enabled' && next) {
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('is_bot', true);
      }
    } else {
      const { error } = await supabase
        .from('app_settings')
        .update({ [key]: next, updated_at: new Date().toISOString() })
        .eq('id', 1);
      setBusy(false);
      if (error) { alert('Failed: ' + error.message); return; }
      setApp((a) => ({ ...a, [key]: next }));
    }
    setActive(null);
    showToast('Saved');
  };

  const saveValue = async (key, value) => {
    setBusy(true);
    const botNumberKeys = ['post_frequency_minutes','daily_post_limit','daily_comment_limit'];
    if (botNumberKeys.includes(key)) {
      const num = Math.max(1, Math.min(10000, Number(value) || 1));
      const { error } = await supabase
        .from('bot_config')
        .update({ [key]: num, updated_at: new Date().toISOString() })
        .eq('id', 1);
      setBusy(false);
      if (error) { alert('Failed: ' + error.message); return; }
      setBot((b) => ({ ...b, [key]: num }));
    } else {
      const { error } = await supabase
        .from('app_settings')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('id', 1);
      setBusy(false);
      if (error) { alert('Failed: ' + error.message); return; }
      setApp((a) => ({ ...a, [key]: value }));
    }
    setActive(null);
    showToast('Saved');
  };

  const runBotTick = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('bot-tick', { body: {} });
      if (error) throw error;
      showToast('Tick ran');
      await load();
    } catch (e) {
      alert('Tick failed: ' + e.message);
    } finally {
      setBusy(false);
      setActive(null);
    }
  };

  const formatValue = (row) => {
    const v = getValue(row.key);
    if (row.type === 'toggle') return v ? 'ON' : 'OFF';
    if (row.type === 'number') return String(v ?? '—');
    if (row.type === 'action') return '';
    const s = String(v ?? '');
    return s.length > 30 ? s.slice(0, 30) + '…' : (s || '—');
  };

  if (loading) return <div className="state">Loading…</div>;

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <ShieldIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Settings
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          App configuration, bots, moderation and feature flags
        </div>
      </div>

      {/* BOT STATS STRIP */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24,
        padding: '0 20px 24px', fontSize: 12, color: 'var(--text-3)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{botCount}</div>
          <div>bots</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{botPostsToday}</div>
          <div>posts / 24h</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{bot.post_frequency_minutes || 10}</div>
          <div>min interval</div>
        </div>
      </div>

      {/* SECTIONS */}
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div style={{
            padding: '20px 20px 8px',
            fontSize: 12, fontWeight: 600,
            color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {section.title}
          </div>
          {section.rows.map((row) => {
            const v = getValue(row.key);
            const on = row.type === 'toggle' && !!v;
            return (
              <button
                key={row.key}
                onClick={() => openRow(row)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '16px 20px',
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: '#fff', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {row.desc}
                  </div>
                </div>
                {row.type === 'toggle' ? (
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: on ? '#22c55e' : 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {on ? 'ON' : 'OFF'}
                  </span>
                ) : row.type === 'action' ? (
                  <span style={{ display: 'inline-flex', color: 'var(--text-3)', opacity: 0.5 }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatValue(row)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'calc(var(--nav-h, 0px) + 20px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#22c55e', color: '#fff',
          padding: '10px 20px', borderRadius: 20,
          fontSize: 13, fontWeight: 600,
          zIndex: 500, boxShadow: '0 6px 20px rgba(34,197,94,.4)',
        }}>
          {toast}
        </div>
      )}

      {/* DRAWER */}
      {active && (
        <>
          <div
            onClick={() => setActive(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 300 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              background: 'var(--surface)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 310, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', animation: 'drawer-slide-up 250ms ease-out',
              transform: `translateY(${dragY}px)`,
              transition: dragY === 0 ? 'transform 200ms ease-out' : 'none',
            }}
          >
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 0 6px', flexShrink: 0, touchAction: 'none', cursor: 'grab',
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 20px 20px',
              borderBottom: '1px solid var(--border)',
              position: 'relative',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', textAlign: 'center' }}>
                {active.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, textAlign: 'center', maxWidth: 300 }}>
                {active.desc}
              </div>
              <button
                onClick={() => setActive(null)}
                style={{
                  position: 'absolute', top: 0, right: 12,
                  background: 'transparent', border: 'none',
                  color: '#fff', padding: 8, cursor: 'pointer',
                }}
              >
                <XIcon width={22} height={22} />
              </button>
            </div>

            <div style={{ padding: '24px 20px 28px' }}>
              {active.type === 'toggle' && (
                <button
                  onClick={() => saveToggle(active.key, !getValue(active.key))}
                  disabled={busy}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', padding: 18,
                    background: getValue(active.key) ? '#ef4444' : '#22c55e',
                    color: '#fff', border: 'none', borderRadius: 16,
                    fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {getValue(active.key) ? 'Turn OFF' : 'Turn ON'}
                </button>
              )}

              {(active.type === 'text' || active.type === 'number') && (
                <>
                  {active.key === 'maintenance_message' ? (
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%', minHeight: 100,
                        background: 'var(--surface-2)', border: 'none',
                        borderRadius: 14, padding: 14,
                        color: '#fff', fontSize: 14, lineHeight: 1.5,
                        outline: 'none', fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  ) : (
                    <input
                      type={active.type === 'number' ? 'number' : 'text'}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      style={{
                        width: '100%', padding: 16,
                        background: 'var(--surface-2)', border: 'none',
                        borderRadius: 14, color: '#fff',
                        fontSize: 16, outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  )}
                  <button
                    onClick={() => saveValue(active.key, draft)}
                    disabled={busy}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', padding: 16, marginTop: 16,
                      background: 'var(--brand)', color: '#fff',
                      border: 'none', borderRadius: 16,
                      fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                </>
              )}

              {active.type === 'action' && active.key === 'run_tick' && (
                <button
                  onClick={runBotTick}
                  disabled={busy}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', padding: 18,
                    background: 'var(--brand)', color: '#fff',
                    border: 'none', borderRadius: 16,
                    fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {busy ? 'Running…' : 'Run tick now'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
