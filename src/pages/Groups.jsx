import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  BuildingIcon,
  TrashIcon,
  BanIcon,
  XIcon,
  ChevronRightIcon,
  UserIcon,
} from '../components/Icons.jsx';

const STATUS_ROWS = [
  { key: 'active',   label: 'Active',   color: '#22c55e' },
  { key: 'archived', label: 'Archived', color: '#ef4444' },
];

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

export default function Groups() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rowOpen, setRowOpen] = useState(null);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const load = async () => {
    setLoading(true);
    setErr('');
    const { data, error } = await supabase
      .from('groups')
      .select('*, creator:profiles!groups_created_by_fkey(id, full_name, email)')
      .order('created_at', { ascending: false });
    if (error) {
      setErr(error.message + ' — ' + (error.details || ''));
      setGroups([]);
    } else {
      setGroups(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  const openGroup = (g) => {
    setActive(g);
    setDragY(0);
  };

  const toggleArchive = async (g) => {
    setBusy(true);
    const next = !g.is_archived;
    // optimistic
    setGroups((old) => old.map((x) => x.id === g.id ? { ...x, is_archived: next } : x));
    setActive(null);

    const { error } = await supabase
      .from('groups')
      .update({ is_archived: next })
      .eq('id', g.id);

    if (error) {
      setBusy(false);
      alert('Failed: ' + error.message);
      load();
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id,
      action: next ? 'archive_group' : 'unarchive_group',
      target_type: 'group',
      target_id: g.id,
    });

    setBusy(false);
    setMsg(next ? 'Group archived' : 'Group restored');
    setTimeout(() => setMsg(''), 2500);
  };

  const remove = async (g) => {
    if (!confirm(`Delete group "${g.name}" permanently? This cannot be undone.`)) return;
    setBusy(true);
    // optimistic
    setGroups((old) => old.filter((x) => x.id !== g.id));
    setActive(null);

    const { error } = await supabase.from('groups').delete().eq('id', g.id);
    if (error) {
      setBusy(false);
      alert('Delete failed: ' + error.message);
      load();
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id,
      action: 'delete_group',
      target_type: 'group',
      target_id: g.id,
      details: { name: g.name },
    });

    setBusy(false);
    setMsg('Group deleted');
    setTimeout(() => setMsg(''), 2500);
  };

  const counts = {
    active: groups.filter((g) => !g.is_archived).length,
    archived: groups.filter((g) => g.is_archived).length,
  };

  const rowItems = rowOpen
    ? groups.filter((g) => rowOpen === 'archived' ? g.is_archived : !g.is_archived)
    : [];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <BuildingIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Groups
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          {groups.length} {groups.length === 1 ? 'group' : 'groups'} · manage student communities
        </div>
      </div>

      {err && (
        <div style={{ margin: '0 16px 12px', background: '#7f1d1d', color: '#fff', padding: 10, borderRadius: 8, fontSize: 13 }}>
          {err}
        </div>
      )}

      {msg && (
        <div style={{ margin: '0 20px 16px', background: 'rgba(34,197,94,.15)', color: '#22c55e', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
          {msg}
        </div>
      )}

      {/* DOT ROWS */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {STATUS_ROWS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRowOpen(r.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 18,
              width: '100%', padding: '20px 16px',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--border)',
              color: '#fff', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 5, background: r.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: counts[r.key] > 0 ? '#fff' : 'var(--text-3)' }}>
              {counts[r.key]}
            </span>
            <span style={{ display: 'inline-flex', color: 'var(--text-3)', opacity: 0.5 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="state">Loading…</div>}

      {/* ROW DRAWER */}
      {rowOpen && (
        <>
          <div
            onClick={() => setRowOpen(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              maxHeight: '85vh', background: 'var(--surface)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 210, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', animation: 'drawer-slide-up 250ms ease-out',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{
              padding: '8px 20px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{
                width: 12, height: 12, borderRadius: 6,
                background: STATUS_ROWS.find((r) => r.key === rowOpen)?.color || '#fff',
              }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {STATUS_ROWS.find((r) => r.key === rowOpen)?.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {rowItems.length} {rowItems.length === 1 ? 'group' : 'groups'}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setRowOpen(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', padding: 8, cursor: 'pointer' }}
              >
                <XIcon width={22} height={22} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              {rowItems.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  Nothing here
                </div>
              )}
              {rowItems.map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => openGroup(g)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    width: '100%', padding: '14px 20px',
                    background: 'transparent', border: 'none',
                    borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)',
                    color: '#fff', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: g.cover_url ? `url(${g.cover_url}) center/cover` : 'linear-gradient(135deg, var(--brand) 0%, #7f1d1d 100%)',
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 500, color: '#fff',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {g.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {g.member_count ?? 0} {g.member_count === 1 ? 'member' : 'members'} · {g.category || 'General'}
                    </div>
                  </div>
                  <ChevronRightIcon width={18} height={18} style={{ opacity: 0.4, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ACTION DRAWER */}
      {active && (
        <>
          <div
            onClick={() => setActive(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              maxHeight: '90vh', background: 'var(--surface)',
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

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 28 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 20px 20px',
                borderBottom: '1px solid var(--border)',
                position: 'relative',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 16,
                  background: active.cover_url ? `url(${active.cover_url}) center/cover` : 'linear-gradient(135deg, var(--brand) 0%, #7f1d1d 100%)',
                }} />
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12, textAlign: 'center' }}>
                  {active.name}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  color: active.is_archived ? '#ef4444' : '#22c55e',
                  marginTop: 8, letterSpacing: 0.6,
                }}>
                  {active.is_archived ? 'Archived' : 'Active'}
                </div>
                <button
                  onClick={() => setActive(null)}
                  style={{
                    position: 'absolute', top: 4, right: 12,
                    background: 'transparent', border: 'none',
                    color: '#fff', padding: 8, cursor: 'pointer',
                  }}
                >
                  <XIcon width={22} height={22} />
                </button>
              </div>

              {active.description && (
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
                  }}>
                    Description
                  </div>
                  <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.55 }}>
                    {active.description}
                  </div>
                </div>
              )}

              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
                }}>
                  Group details
                </div>
                <DetailRow label="Category" value={active.category || 'General'} />
                <DetailRow label="Members" value={String(active.member_count ?? 0)} />
                <DetailRow label="Creator" value={active.creator?.full_name || '—'} />
                <DetailRow label="Created" value={timeAgo(active.created_at)} />
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => toggleArchive(active)}
                  disabled={busy}
                  style={actionBtn('var(--surface-2)', '#f97316')}
                >
                  <BanIcon width={20} height={20} />
                  {active.is_archived ? 'Restore group' : 'Archive group'}
                </button>
                <button
                  onClick={() => remove(active)}
                  disabled={busy}
                  style={actionBtn('transparent', 'var(--brand)', '1.5px solid var(--brand)')}
                >
                  <TrashIcon width={20} height={20} />
                  Delete permanently
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#fff', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

const actionBtn = (bg, color, border) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '16px', background: bg, color,
  border: border || 'none', borderRadius: 14,
  fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
});
