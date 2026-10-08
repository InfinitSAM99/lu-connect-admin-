import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORY_LABELS = {
  nudity: 'Nudity',
  hate: 'Hate Speech',
  harassment: 'Harassment',
  spam: 'Spam',
  self_harm: 'Self Harm',
  violence: 'Violence',
  other: 'Other',
  none: 'None',
};

const CATEGORY_COLORS = {
  nudity: '#ec4899',
  hate: '#dc2626',
  harassment: '#f97316',
  spam: '#eab308',
  self_harm: '#8b5cf6',
  violence: '#b91c1c',
  other: '#6b7280',
  none: '#6b7280',
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

export default function Moderation() {
  const { profile } = useAuth();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [errMsg, setErrMsg] = useState('');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('moderation_flags')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (filter !== 'all') q = q.eq('status', filter);

    const { data, error } = await q;

    if (error) {
      setErrMsg(error.message);
      setLoading(false);
      return;
    }

    // Fetch author profiles separately
    const authorIds = [...new Set((data || []).map((f) => f.author_id).filter(Boolean))];
    const authorMap = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('id', authorIds);
      (profiles || []).forEach((p) => { authorMap[p.id] = p; });
    }

    setFlags((data || []).map((f) => ({ ...f, author: authorMap[f.author_id] })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const approve = async (flag) => {
    if (!confirm('Mark this flag as a false positive? The post stays up.')) return;
    setBusy(flag.id);
    await supabase
      .from('moderation_flags')
      .update({ status: 'approved', reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq('id', flag.id);
    setBusy(null);
    load();
  };

  const removeContent = async (flag) => {
    if (!confirm('Remove this post? It will be hidden from all users.')) return;
    setBusy(flag.id);
    await supabase.from('posts').update({ is_deleted: true }).eq('id', flag.content_id);
    await supabase
      .from('moderation_flags')
      .update({ status: 'removed', reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq('id', flag.id);
    setBusy(null);
    load();
  };

  const banAuthor = async (flag) => {
    if (!flag.author_id) return;
    if (!confirm(`Ban ${flag.author?.full_name || 'this user'}? They will lose access to the app.`)) return;
    setBusy(flag.id);
    await supabase
      .from('profiles')
      .update({ approval_status: 'banned' })
      .eq('id', flag.author_id);
    await supabase
      .from('moderation_flags')
      .update({ status: 'banned', reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq('id', flag.id);
    setBusy(null);
    load();
  };

  const counts = {
    pending: flags.filter((f) => f.status === 'pending').length,
    approved: flags.filter((f) => f.status === 'approved').length,
    removed: flags.filter((f) => f.status === 'removed').length,
    banned: flags.filter((f) => f.status === 'banned').length,
  };

  const filters = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'removed', label: 'Removed' },
    { key: 'banned', label: 'Banned' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 4px' }}>AI Moderation</h2>
      <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '0 0 16px' }}>
        Content automatically flagged by the AI. Review and take action.
      </p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Pending', value: counts.pending, color: '#f97316' },
          { label: 'Approved', value: counts.approved, color: '#22c55e' },
          { label: 'Removed', value: counts.removed, color: '#dc2626' },
          { label: 'Banned', value: counts.banned, color: '#b91c1c' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, marginTop: 4 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <button
            key={f.key}
            className={'btn' + (filter === f.key ? ' btn-primary' : '')}
            onClick={() => setFilter(f.key)}
            style={{ fontSize: 13 }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {errMsg && (
        <div style={{ background: '#7f1d1d', color: '#fff', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {errMsg}
        </div>
      )}

      {loading && <div className="state">Loading…</div>}

      {!loading && flags.length === 0 && (
        <div className="card state" style={{ padding: 24 }}>
          <h3>No {filter !== 'all' ? filter : ''} flags</h3>
          <p>Nothing to review here.</p>
        </div>
      )}

      {flags.map((flag) => (
        <div
          key={flag.id}
          className="card"
          style={{
            padding: 14,
            marginBottom: 10,
            borderLeft: `3px solid ${CATEGORY_COLORS[flag.ai_category] || '#6b7280'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              {/* Badges row */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: CATEGORY_COLORS[flag.ai_category] || '#6b7280',
                    color: '#fff',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}
                >
                  {CATEGORY_LABELS[flag.ai_category] || flag.ai_category || 'Other'}
                </span>
                <span
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  {Math.round((flag.ai_confidence || 0) * 100)}% confidence
                </span>
                <span
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {flag.content_type}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 0' }}>
                  {timeAgo(flag.created_at)}
                </span>
              </div>

              {/* Author */}
              {flag.author && (
                <Link
                  to={`/students/${flag.author_id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text)' }}
                >
                  <img
                    className="avatar"
                    width={24}
                    height={24}
                    src={flag.author.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${flag.author.full_name}`}
                    alt=""
                  />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{flag.author.full_name}</span>
                  {flag.author.username && (
                    <span style={{ color: 'var(--text-3)', fontSize: 12 }}>@{flag.author.username}</span>
                  )}
                </Link>
              )}

              {/* Content preview */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 14,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {flag.content_preview || '(no text preview)'}
              </div>

              {/* AI reason */}
              {flag.ai_reason && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, fontStyle: 'italic' }}>
                  AI reason: {flag.ai_reason}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {flag.status === 'pending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130 }}>
                <button
                  className="btn"
                  onClick={() => approve(flag)}
                  disabled={busy === flag.id}
                  style={{ fontSize: 13 }}
                >
                  ✅ Approve
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => removeContent(flag)}
                  disabled={busy === flag.id}
                  style={{ fontSize: 13 }}
                >
                  🗑 Remove
                </button>
                <button
                  className="btn"
                  onClick={() => banAuthor(flag)}
                  disabled={busy === flag.id}
                  style={{ fontSize: 13, color: 'var(--danger)' }}
                >
                  🚫 Ban user
                </button>
              </div>
            )}

            {flag.status !== 'pending' && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color:
                    flag.status === 'approved'
                      ? 'var(--success)'
                      : 'var(--danger)',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                }}
              >
                {flag.status}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
