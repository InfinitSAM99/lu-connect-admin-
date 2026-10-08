import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { askAdminAI } from '../lib/ai';

const SUGGESTIONS = [
  'How do I verify a student?',
  'How does moderation work?',
  'What does the maintenance mode do?',
  'How do I suspend a user?',
  'What can I do in the Payments page?',
  'How are reports handled?',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [stats, setStats] = useState(null);
  const scrollRef = useRef(null);

  // Load a fresh stats snapshot for the AI
  const loadStats = async () => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [
      users, posts, comments, groups, events, announcements,
      pendingApprovals, pendingPayments, pendingFlags, pendingReports,
      online, activeToday, signupsToday, signupsWeek,
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('groups').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('moderation_flags').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', twoMinAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', todayStart),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    ]);

    const snapshot = {
      total_users: users.count || 0,
      total_posts: posts.count || 0,
      total_comments: comments.count || 0,
      total_groups: groups.count || 0,
      total_events: events.count || 0,
      published_announcements: announcements.count || 0,
      pending_approvals: pendingApprovals.count || 0,
      pending_payments: pendingPayments.count || 0,
      pending_flags: pendingFlags.count || 0,
      pending_reports: pendingReports.count || 0,
      online_now: online.count || 0,
      active_today: activeToday.count || 0,
      signups_today: signupsToday.count || 0,
      signups_this_week: signupsWeek.count || 0,
    };
    setStats(snapshot);
    return snapshot;
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || sending) return;

    setInput('');
    setErr('');

    const next = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setSending(true);

    // Refresh stats snapshot for accuracy
    const freshStats = await loadStats();

    const { reply, error } = await askAdminAI({
      question: q,
      stats: freshStats,
      history: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    setSending(false);

    if (error) {
      setErr(error);
      return;
    }

    setMessages([...next, { role: 'assistant', content: reply }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send();
  };

  const clearChat = () => {
    setMessages([]);
    setErr('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">Ask questions about the platform, operations, or current stats</p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost" onClick={clearChat}>Clear</button>
        )}
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 0,
        }}
      >
        {messages.length === 0 && (
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 16 }}>
              Ask me anything about LU CONNECT. I have the operations manual + a live stats snapshot.
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="btn"
                  onClick={() => send(s)}
                  style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: 13 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '88%',
                padding: '12px 14px',
                borderRadius: 16,
                fontSize: 14,
                lineHeight: 1.55,
                whiteSpace: m.role === 'user' ? 'pre-wrap' : 'normal',
                background: m.role === 'user' ? 'var(--brand)' : 'var(--surface-2)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 16,
                background: 'var(--surface-2)',
                color: 'var(--text-3)',
                fontSize: 14,
                borderBottomLeftRadius: 4,
              }}
            >
              Thinking…
            </div>
          </div>
        )}

        {err && (
          <div
            style={{
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
              padding: 10,
              borderRadius: 10,
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}
      </div>

      {stats && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            padding: '6px 0',
            borderTop: '1px solid var(--border)',
          }}
        >
          Snapshot: {stats.total_users} users · {stats.total_posts} posts · {stats.pending_approvals} pending approvals · {stats.pending_flags} flags · {stats.pending_reports} reports
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 8,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
        }}
      >
        <input
          className="input"
          placeholder="Ask about the platform…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" disabled={sending || !input.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
