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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#000', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
      
      {/* Header - Native App Style */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: '#0a0a0a', borderBottom: '1px solid #222' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
          AI
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>LU Connect Assistant</h1>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Online & Ready</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} style={{ background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer' }}>Clear</button>
        )}
      </div>

      {/* Chat Area - Full Screen */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          background: '#000'
        }}
      >
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#fff' }}>How can I help you today?</h2>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 32, maxWidth: 300 }}>
              I have access to live stats and your operations manual.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 400 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{ 
                    background: '#111', border: '1px solid #222', color: '#eee', 
                    padding: '14px 16px', borderRadius: 12, fontSize: 14, 
                    textAlign: 'left', cursor: 'pointer' 
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0, 
                background: isUser ? '#333' : '#ef4444', 
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold' 
              }}>
                {isUser ? 'ME' : 'AI'}
              </div>
              <div style={{
                maxWidth: '78%',
                padding: '12px 16px',
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                background: isUser ? '#ef4444' : '#1a1a1a',
                color: '#fff',
                borderRadius: 20,
                borderBottomRightRadius: isUser ? 4 : 20,
                borderBottomLeftRadius: isUser ? 20 : 4,
              }}>
                {m.content}
              </div>
            </div>
          );
        })}

        {sending && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
             <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold' }}>AI</div>
            <div style={{ padding: '12px 16px', borderRadius: 20, background: '#1a1a1a', color: '#888', fontSize: 14, borderBottomLeftRadius: 4 }}>
              Thinking...
            </div>
          </div>
        )}

        {err && (
          <div style={{ background: '#3a1111', color: '#ef4444', padding: 12, borderRadius: 12, fontSize: 13, textAlign: 'center' }}>
            {err}
          </div>
        )}
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div style={{ padding: '12px 16px', background: '#0a0a0a', borderTop: '1px solid #222', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            placeholder="Message AI Assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            style={{ 
              flex: 1, padding: '14px 20px', borderRadius: 24, 
              background: '#1a1a1a', border: '1px solid #333', 
              color: '#fff', fontSize: 15, outline: 'none' 
            }}
          />
          <button 
            disabled={sending || !input.trim()}
            style={{ 
              width: 48, height: 48, borderRadius: 24, 
              background: '#ef4444', color: '#fff', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, cursor: input.trim() ? 'pointer' : 'not-allowed',
              opacity: input.trim() ? 1 : 0.5
            }}
          >
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}
