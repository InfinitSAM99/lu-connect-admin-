import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
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
} from '../components/Icons.jsx';

function initials(name) {
  if (!name) return 'U';
  return name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
}

function fullDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Students() {
  const { profile: me } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);
  const debounceRef = useRef(null);

  const load = async (searchTerm = '') => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, email, full_name, username, avatar_url, faculty, course, year_of_study, role_id, is_verified, is_suspended, is_broadcast_only, created_at, displayed_follower_count, approval_status, roles(name, level)')
      .order('created_at', { ascending: false })
      .limit(300);

    const term = searchTerm.trim();
    if (term) {
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,username.ilike.%${term}%`);
    }

    const { data } = await query;
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(''); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q), 150);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

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
    if (error) { alert(error.message); setBusy(null); return; }
    await logAction(newStatus ? 'suspend_user' : 'reactivate_user', s.id, { reason });
    setBusy(null);
    setDrawer(null);
    load(q);
  };

  const banUser = async (s) => {
    if (!confirm(`Ban ${s.full_name}? They will lose access to LU CONNECT and be sent to the appeal page.`)) return;
    setBusy(s.id);
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'banned' })
      .eq('id', s.id);
    if (error) { alert(error.message); setBusy(null); return; }
    await logAction('ban_user', s.id);
    setBusy(null);
    setDrawer(null);
    load(q);
  };

  const approveUser = async (s) => {
    setBusy(s.id);
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', s.id);
    if (error) { alert(error.message); setBusy(null); return; }
    await logAction('approve_user', s.id);
    setBusy(null);
    setDrawer(null);
    load(q);
  };

  const closeDrawer = () => { setDrawer(null); setDragY(0); };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 24px 20px',
          gap: 12,
        }}
      >
        <UsersIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Students
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
          Manage students, verify accounts, suspend or ban abusers.
        </div>
      </div>

      {/* SEARCH */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          margin: '0 16px 12px',
          background: 'var(--surface-2)',
          borderRadius: 14,
          padding: '4px 14px',
        }}
      >
        <SearchIcon width={18} height={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, or username"
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: 15,
            padding: '12px 0',
            fontFamily: 'inherit',
          }}
        />
        {q.length > 0 && (
          <button
            onClick={() => setQ('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-3)',
              cursor: 'pointer',
              padding: 4,
            }}
            aria-label="Clear"
          >
            <XIcon width={18} height={18} />
          </button>
        )}
      </div>

      {loading && <div className="state">Loading…</div>}

      {!loading && students.length === 0 && (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          {q ? 'No students match your search' : 'No students yet'}
        </div>
      )}

      {/* STUDENT LIST */}
      {!loading && students.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {students.map((s) => {
            const role = s.roles?.name || 'student';
            return (
              <button
                key={s.id}
                onClick={() => setDrawer(s)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: '100%',
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: 'var(--surface-2)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {s.avatar_url ? (
                    <img
                      src={s.avatar_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <UserIcon width={24} height={24} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.full_name || 'Unnamed'}
                  </div>
                  {(role !== 'student' || s.is_suspended || s.approval_status === 'banned') && (
                    <div style={{ fontSize: 12, marginTop: 3, color: 'var(--text-3)' }}>
                      {role !== 'student' && <span style={{ textTransform: 'capitalize' }}>{role.replace('_', ' ')}</span>}
                      {s.is_suspended && <span style={{ color: '#f97316', marginLeft: 8 }}>Suspended</span>}
                      {s.approval_status === 'banned' && <span style={{ color: '#ef4444', marginLeft: 8 }}>Banned</span>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* DETAIL DRAWER */}
      {drawer && (
        <>
          <div
            onClick={closeDrawer}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '88vh',
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
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  background: 'var(--surface-2)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {drawer.avatar_url ? (
                  <img
                    src={drawer.avatar_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <UserIcon width={36} height={36} />
                )}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fff',
                  marginTop: 12,
                  textAlign: 'center',
                }}
              >
                {drawer.full_name || 'Unnamed'}
              </div>
              {drawer.username && (
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                  @{drawer.username}
                </div>
              )}
              <button
                onClick={closeDrawer}
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

            <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              {/* INFO ROWS */}
              <InfoRow icon={<MailIcon width={20} height={20} />} label="Email" value={drawer.email} />
              <InfoRow icon={<GraduationIcon width={20} height={20} />} label="Faculty" value={drawer.faculty || '—'} />
              <InfoRow icon={<BookIcon width={20} height={20} />} label="Course" value={drawer.course || '—'} />
              <InfoRow icon={<CalendarIcon width={20} height={20} />} label="Year" value={drawer.year_of_study ? `Year ${drawer.year_of_study}` : '—'} />
              <InfoRow icon={<UsersIcon width={20} height={20} />} label="Role" value={(drawer.roles?.name || 'student').replace('_', ' ')} />
              <InfoRow icon={<AtSignIcon width={20} height={20} />} label="Joined" value={fullDate(drawer.created_at)} />

              {/* STATUS */}
              <div
                style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                {drawer.is_suspended && <Chip label="Suspended" color="#f97316" />}
                {drawer.approval_status === 'banned' && <Chip label="Banned" color="#ef4444" />}
                {drawer.approval_status === 'pending' && <Chip label="Pending approval" color="#eab308" />}
                {drawer.is_verified && <Chip label="Verified" color="#22c55e" />}
                {!drawer.is_suspended && drawer.approval_status !== 'banned' && drawer.approval_status !== 'pending' && !drawer.is_verified && (
                  <Chip label="Active" color="#6d7382" />
                )}
              </div>

              {/* ACTIONS — hidden when target is super admin or you */}
              {(() => {
                const targetLevel = drawer.roles?.level ?? 0;
                const isProtected = targetLevel >= 3 || drawer.id === me?.id;
                if (isProtected) {
                  return (
                    <div style={{ padding: '0 20px 20px' }}>
                      <div
                        style={{
                          padding: 14,
                          borderRadius: 12,
                          background: 'var(--surface-2)',
                          fontSize: 13,
                          color: 'var(--text-3)',
                          textAlign: 'center',
                          lineHeight: 1.5,
                        }}
                      >
                        {drawer.id === me?.id
                          ? 'This is your own account.'
                          : 'Super admins are protected.'}
                      </div>
                    </div>
                  );
                }
                return (
                  <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {drawer.approval_status === 'pending' && (
                      <button
                        onClick={() => approveUser(drawer)}
                        disabled={busy === drawer.id}
                        style={actionBtn('transparent', '#22c55e', '1.5px solid #22c55e')}
                      >
                        <CheckIcon width={20} height={20} />
                        Approve account
                      </button>
                    )}
                    <button
                      onClick={() => toggleSuspend(drawer)}
                      disabled={busy === drawer.id}
                      style={actionBtn('var(--surface-2)', '#f97316')}
                    >
                      <BanIcon width={20} height={20} />
                      {drawer.is_suspended ? 'Reactivate account' : 'Suspend account'}
                    </button>
                    {drawer.approval_status !== 'banned' && (
                      <button
                        onClick={() => banUser(drawer)}
                        disabled={busy === drawer.id}
                        style={actionBtn('var(--brand)', '#fff')}
                      >
                        <BanIcon width={20} height={20} />
                        Ban account
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderTop: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-3)', display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
        <div
          style={{
            fontSize: 15,
            color: '#fff',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textTransform: label === 'Role' ? 'capitalize' : 'none',
          }}
        >
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color,
        padding: '5px 12px',
        borderRadius: 20,
        background: 'var(--surface-2)',
        border: `1px solid ${color}33`,
      }}
    >
      {label}
    </span>
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
