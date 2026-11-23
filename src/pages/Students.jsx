import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { useLiveQuery } from '../lib/useLiveQuery';
import {
  UsersIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  BanIcon,
  UserIcon,
  MailIcon,
  AtSignIcon,
  BookIcon,
  GraduationIcon,
  CalendarIcon,
  ChevronRightIcon,
  BuildingIcon,
  ClipboardIcon,
} from '../components/Icons.jsx';

function fullDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

const SELECT_COLS =
  'id, email, full_name, username, avatar_url, faculty, course, year_of_study, university_name, role_id, is_verified, is_suspended, is_broadcast_only, is_bot, created_at, displayed_follower_count, approval_status, roles(name, level)';

export default function Students() {
  const { profile: me } = useAuth();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const { data: students, loading } = useLiveQuery(
    'students:all',
    () =>
      supabase
        .from('profiles')
        .select(SELECT_COLS)
        .order('created_at', { ascending: false })
        .limit(300),
    { table: 'profiles', event: '*' },
    { cacheTtl: 3 * 60 * 1000, initialData: [] }
  );

  const list = students || [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((s) => {
      const name = (s.full_name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const uname = (s.username || '').toLowerCase();
      return name.includes(term) || email.includes(term) || uname.includes(term);
    });
  }, [list, q]);

  const drawer = useMemo(
    () => (drawerId ? list.find((s) => s.id === drawerId) || null : null),
    [drawerId, list]
  );

  useEffect(() => {
    if (drawerId && !drawer && !loading) setDrawerId(null);
  }, [drawerId, drawer, loading]);

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
    if (dragY > 100) closeDrawer();
    setDragY(0);
    activeRef.current = false;
  };
  const closeDrawer = () => {
    setDrawerId(null);
    setDragY(0);
  };

  const logAction = async (action, targetId, details = {}) => {
    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id,
      action,
      target_type: 'profile',
      target_id: targetId,
      details,
    });
  };

  const toggleSuspend = async (s) => {
    const newStatus = !s.is_suspended;
    if (!confirm(`${newStatus ? 'Suspend' : 'Reactivate'} ${s.full_name}?`)) return;
    const reason = newStatus ? prompt('Reason for suspension:') || 'Policy violation' : null;
    setBusy(s.id);
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: newStatus, suspended_reason: reason })
      .eq('id', s.id);
    if (error) {
      alert(error.message);
      setBusy(null);
      return;
    }
    await logAction(newStatus ? 'suspend_user' : 'reactivate_user', s.id, { reason });
    setBusy(null);
  };

  const banUser = async (s) => {
    if (!confirm(`Ban ${s.full_name}? They will lose access to LU CONNECT and be sent to the appeal page.`)) return;
    setBusy(s.id);
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'banned' })
      .eq('id', s.id);
    if (error) {
      alert(error.message);
      setBusy(null);
      return;
    }
    await logAction('ban_user', s.id);
    setBusy(null);
  };

  const approveUser = async (s) => {
    setBusy(s.id);
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', s.id);
    if (error) {
      alert(error.message);
      setBusy(null);
      return;
    }
    await logAction('approve_user', s.id);
    setBusy(null);
  };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100%', maxWidth: 700, margin: '0 auto', padding: '0 16px', paddingBottom: 100 }}>
      
      {/* HEADER MATCHING OTHER PREMIUM PAGES */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40, marginBottom: 30 }}>
        <div style={{ marginBottom: 16 }}>
          <UsersIcon width={72} height={72} style={{ color: '#fff' }} />
        </div>
        <div style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Students</div>
        <div style={{ color: '#6d7382', fontSize: 14, textAlign: 'center', maxWidth: 300 }}>
          Manage students, verify accounts, suspend or ban abusers.
        </div>
      </div>

      {/* SEARCH BAR */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#111',
          border: '1px solid #222',
          borderRadius: 16,
          padding: '14px 16px',
        }}>
          <SearchIcon width={20} height={20} style={{ color: '#6d7382', flexShrink: 0 }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, or username"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 15 }}
          />
          {q.length > 0 && (
            <button onClick={() => setQ('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <XIcon width={18} height={18} style={{ color: '#6d7382' }} />
            </button>
          )}
        </div>
      </div>

      {/* LIST */}
      {loading && list.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #1f1f1f', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: '#6d7382', fontSize: 14 }}>
          {q ? 'No students match your search' : 'No students yet'}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((s) => {
            const role = s.roles?.name || 'student';
            return (
              <div
                key={s.id}
                onClick={() => setDrawerId(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 0',
                  borderBottom: '1px solid #1f1f1f',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 50, height: 50, borderRadius: 25, background: '#1f1f1f', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon width={24} height={24} style={{ color: '#6d7382' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.full_name || 'Unnamed'}
                  </div>
                  {(role !== 'student' || s.is_suspended || s.approval_status === 'banned' || s.is_bot) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 4 }}>
                      {s.is_bot && <span style={{ color: '#a855f7' }}>Bot</span>}
                      {!s.is_bot && role !== 'student' && <span style={{ color: '#6d7382', textTransform: 'capitalize' }}>{role.replace('_', ' ')}</span>}
                      {s.is_suspended && <span style={{ color: '#f97316' }}>Suspended</span>}
                      {s.approval_status === 'banned' && <span style={{ color: '#ef4444' }}>Banned</span>}
                    </div>
                  )}
                </div>

                <ChevronRightIcon width={20} height={20} style={{ color: '#3f3f3f', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL DRAWER */}
      {drawer && (
        <>
          <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              maxHeight: '88vh',
              background: '#000',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              zIndex: 210, display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              animation: 'drawer-slide-up 250ms ease-out',
              transform: `translateY(${dragY}px)`,
              transition: dragY === 0 ? 'transform 200ms ease-out' : 'none',
            }}
          >
            <style>{`@keyframes drawer-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 8px', flexShrink: 0, touchAction: 'none', cursor: 'grab' }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 20px 20px', borderBottom: '1px solid #1f1f1f', flexShrink: 0, position: 'relative' }}>
              <div style={{ width: 80, height: 80, borderRadius: 40, background: '#1f1f1f', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {drawer.avatar_url ? (
                  <img src={drawer.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserIcon width={36} height={36} style={{ color: '#6d7382' }} />
                )}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 12, textAlign: 'center' }}>
                {drawer.full_name || 'Unnamed'}
              </div>
              {drawer.username && <div style={{ fontSize: 13, color: '#6d7382', marginTop: 4 }}>@{drawer.username}</div>}
              <button onClick={closeDrawer} style={{ position: 'absolute', top: 8, right: 12, background: 'transparent', border: 'none', color: '#fff', padding: 8, cursor: 'pointer' }}>
                <XIcon width={22} height={22} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              <InfoRow icon={<MailIcon width={20} height={20} />} label="Email" value={drawer.email} />
              <InfoRow icon={<ClipboardIcon width={20} height={20} />} label="User ID" value={drawer.id} />
              <InfoRow icon={<BuildingIcon width={20} height={20} />} label="University" value={drawer.university_name || '—'} />
              <InfoRow icon={<GraduationIcon width={20} height={20} />} label="Faculty" value={drawer.faculty || '—'} />
              <InfoRow icon={<BookIcon width={20} height={20} />} label="Course" value={drawer.course || '—'} />
              <InfoRow icon={<CalendarIcon width={20} height={20} />} label="Year" value={drawer.year_of_study ? `Year ${drawer.year_of_study}` : '—'} />
              <InfoRow icon={<UsersIcon width={20} height={20} />} label="Role" value={(drawer.roles?.name || 'student').replace('_', ' ')} />
              <InfoRow icon={<AtSignIcon width={20} height={20} />} label="Joined" value={fullDate(drawer.created_at)} />

              <div style={{ padding: '16px 20px', borderTop: '1px solid #1f1f1f', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {drawer.is_bot && <Chip label="Bot" color="#a855f7" />}
                {drawer.is_suspended && <Chip label="Suspended" color="#f97316" />}
                {drawer.approval_status === 'banned' && <Chip label="Banned" color="#ef4444" />}
                {drawer.approval_status === 'pending' && <Chip label="Pending approval" color="#eab308" />}
                {drawer.is_verified && <Chip label="Verified" color="#22c55e" />}
                {!drawer.is_bot && !drawer.is_suspended && drawer.approval_status !== 'banned' && drawer.approval_status !== 'pending' && !drawer.is_verified && (
                  <Chip label="Active" color="#6d7382" />
                )}
              </div>

              {(() => {
                const targetLevel = drawer.roles?.level ?? 0;
                const isSelf = drawer.id === me?.id;
                const isProtected = targetLevel >= 3 || isSelf;
                const isBot = drawer.is_bot === true;

                if (isBot) return <div style={{ padding: '0 20px 20px' }}><div style={{ padding: 14, borderRadius: 12, background: '#111', fontSize: 13, color: '#6d7382', textAlign: 'center', lineHeight: 1.5 }}>This is a system bot account. Manage bots from Settings.</div></div>;
                if (isProtected) return <div style={{ padding: '0 20px 20px' }}><div style={{ padding: 14, borderRadius: 12, background: '#111', fontSize: 13, color: '#6d7382', textAlign: 'center', lineHeight: 1.5 }}>{isSelf ? 'This is your own account.' : 'Super admins are protected.'}</div></div>;

                return (
                  <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {drawer.approval_status === 'pending' && (
                      <button onClick={() => approveUser(drawer)} disabled={busy === drawer.id} style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}>
                        <CheckIcon width={20} height={20} /> Approve account
                      </button>
                    )}
                    <button onClick={() => toggleSuspend(drawer)} disabled={busy === drawer.id} style={actionBtn('#111', '#f97316')}>
                      <BanIcon width={20} height={20} /> {drawer.is_suspended ? 'Reactivate account' : 'Suspend account'}
                    </button>
                    {drawer.approval_status !== 'banned' && (
                      <button onClick={() => banUser(drawer)} disabled={busy === drawer.id} style={actionBtn('#ef4444', '#fff')}>
                        <BanIcon width={20} height={20} /> Ban account
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: '1px solid #1f1f1f' }}>
      <span style={{ color: '#6d7382', display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#6d7382', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 15, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: label === 'Role' ? 'capitalize' : 'none' }}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color, padding: '5px 12px', borderRadius: 20, background: '#111', border: `1px solid ${color}33` }}>
      {label}
    </span>
  );
}

const actionBtn = (bg, color, border) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '16px', background: bg, color, border: border || 'none',
  borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
});
