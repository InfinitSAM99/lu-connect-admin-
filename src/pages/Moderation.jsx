import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  TrashIcon,
  BanIcon,
  XIcon,
  ClockIcon,
  MenuIcon,
} from '../components/Icons.jsx';

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
  const [errMsg, setErrMsg] = useState('');
  const [busy, setBusy] = useState(null);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

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
    if (dragY > 100) setDrawer(null);
    setDragY(0);
    activeRef.current = false;
  };
  const [drawer, setDrawer] = useState(null); // 'pending' | 'approved' | 'removed' | 'banned' | 'all' | null

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('moderation_flags')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      setErrMsg(error.message);
      setLoading(false);
      return;
    }

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
  }, []);

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
    all: flags.length,
  };

  const CATEGORIES = [
    { key: 'pending', label: 'Pending', icon: ClockIcon, color: '#f97316' },
    { key: 'approved', label: 'Approved', icon: CheckCircleIcon, color: '#22c55e' },
    { key: 'removed', label: 'Removed', icon: TrashIcon, color: '#dc2626' },
    { key: 'banned', label: 'Banned', icon: BanIcon, color: '#b91c1c' },
    { key: 'all', label: 'All', icon: MenuIcon, color: '#ffffff' },
  ];

  const drawerItems = drawer
    ? drawer === 'all'
      ? flags
      : flags.filter((f) => f.status === drawer)
    : [];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 24px 28px',
          gap: 12,
        }}
      >
        <AlertTriangleIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          AI Moderation
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-3)',
            textAlign: 'center',
            maxWidth: 300,
            lineHeight: 1.5,
          }}
        >
          Content automatically flagged by AI. Tap a category to review.
        </div>
      </div>

      {errMsg && (
        <div style={{ margin: '0 16px 12px', background: '#7f1d1d', color: '#fff', padding: 10, borderRadius: 8, fontSize: 13 }}>
          {errMsg}
        </div>
      )}

      {/* CATEGORY BUTTONS — big, flat, no boxes */}
      <div style={{ padding: '0 16px' }}>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const count = counts[c.key];
          return (
            <button
              key={c.key}
              onClick={() => setDrawer(c.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                width: '100%',
                padding: '20px 16px',
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid var(--border)',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ color: c.color, display: 'inline-flex', flexShrink: 0 }}>
                <Icon width={28} height={28} />
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#fff',
                }}
              >
                {c.label}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: count > 0 ? '#fff' : 'var(--text-3)',
                }}
              >
                {count}
              </span>
              <span style={{ display: 'inline-flex', color: 'var(--text-3)', opacity: 0.5 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>
          );
        })}
        <div style={{ borderTop: '1px solid var(--border)' }} />
      </div>

      {/* DRAWER */}
      {drawer && (
        <>
          <div
            onClick={() => setDrawer(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,.6)',
              zIndex: 200,
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
              zIndex: 210,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'drawer-slide-up 250ms ease-out',
              transform: `translateY(${dragY}px)`,
              transition: dragY === 0 ? 'transform 200ms ease-out' : 'none',
            }}
          >
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0 6px',
                flexShrink: 0,
                touchAction: 'none',
                cursor: 'grab',
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

            {(() => {
              const cat = CATEGORIES.find((c) => c.key === drawer);
              const Icon = cat.icon;
              return (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 20px 20px',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  <span style={{ color: cat.color, display: 'inline-flex' }}>
                    <Icon width={48} height={48} />
                  </span>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#fff',
                      marginTop: 12,
                      letterSpacing: 0.3,
                    }}
                  >
                    {cat.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                    {drawerItems.length} {drawerItems.length === 1 ? 'flag' : 'flags'}
                  </div>
                  <button
                    onClick={() => setDrawer(null)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 12,
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      padding: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <XIcon width={22} height={22} />
                  </button>
                </div>
              );
            })()}

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              {drawerItems.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  Nothing here
                </div>
              )}
              {drawerItems.map((flag, i) => (
                <FlagRow
                  key={flag.id}
                  flag={flag}
                  busy={busy}
                  onApprove={() => approve(flag)}
                  onRemove={() => removeContent(flag)}
                  onBan={() => banAuthor(flag)}
                  isFirst={i === 0}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FlagRow({ flag, busy, onApprove, onRemove, onBan, isFirst }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const isPending = flag.status === 'pending';

  return (
    <>
      <div
        onClick={() => setActionsOpen(true)}
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          padding: '16px',
          borderTop: isFirst ? '1px solid var(--border)' : 'none',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: CATEGORY_COLORS[flag.ai_category] || '#6b7280',
            marginTop: 8,
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: CATEGORY_COLORS[flag.ai_category] || '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              {CATEGORY_LABELS[flag.ai_category] || flag.ai_category || 'Other'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {Math.round((flag.ai_confidence || 0) * 100)}% · {timeAgo(flag.created_at)}
            </span>
          </div>

          {flag.author && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <img
                className="avatar"
                width={20}
                height={20}
                src={flag.author.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${flag.author.full_name}`}
                alt=""
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                {flag.author.full_name}
              </span>
            </div>
          )}

          <div
            style={{
              fontSize: 14,
              color: 'var(--text-2)',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {flag.content_preview || '(no text preview)'}
          </div>
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: isPending ? 'var(--text-3)' : '#fff',
            padding: '3px 8px',
            borderRadius: 6,
            background: isPending ? 'transparent' : 'var(--surface-2)',
            border: isPending ? '1px solid var(--border)' : 'none',
            flexShrink: 0,
          }}
        >
          {flag.status}
        </div>
      </div>

      {actionsOpen && (
        <>
          <div
            onClick={() => setActionsOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300 }}
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
                flexDirection: 'column',
                alignItems: 'center',
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

            <div
              style={{
                padding: '12px 20px 20px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: CATEGORY_COLORS[flag.ai_category] || '#6b7280',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 4,
                }}
              >
                {CATEGORY_LABELS[flag.ai_category] || 'Other'} · {Math.round((flag.ai_confidence || 0) * 100)}%
              </div>
              {flag.author && (
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 10 }}>
                  {flag.author.full_name}
                </div>
              )}
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--text-2)',
                  lineHeight: 1.5,
                  maxHeight: 140,
                  overflowY: 'auto',
                }}
              >
                {flag.content_preview || '(no text preview)'}
              </div>
              {flag.ai_reason && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, fontStyle: 'italic' }}>
                  AI: {flag.ai_reason}
                </div>
              )}
            </div>

            {isPending && (
              <div style={{ padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => { setActionsOpen(false); onApprove(); }}
                  disabled={busy === flag.id}
                  style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                >
                  <CheckCircleIcon width={20} height={20} />
                  Approve — keep post
                </button>
                <button
                  onClick={() => { setActionsOpen(false); onRemove(); }}
                  disabled={busy === flag.id}
                  style={actionBtn('var(--surface-2)', '#fff')}
                >
                  <TrashIcon width={20} height={20} />
                  Remove post
                </button>
                <button
                  onClick={() => { setActionsOpen(false); onBan(); }}
                  disabled={busy === flag.id}
                  style={actionBtn('var(--brand)', '#fff')}
                >
                  <BanIcon width={20} height={20} />
                  Ban user
                </button>
              </div>
            )}

            {!isPending && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  Already {flag.status}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

const actionBtn = (bg, color, border) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '16px',
  background: bg,
  color,
  border: border || 'none',
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
});
