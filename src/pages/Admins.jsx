import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ShieldIcon,
  ShieldCheckIcon,
  XIcon,
  UserIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  BanIcon,
} from '../components/Icons.jsx';

const ROLE_COLORS = {
  super_admin: '#ef4444',
  admin: '#f97316',
  moderator: '#3b82f6',
  student: '#6d7382',
};

function roleLabel(name) {
  if (!name) return 'Member';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Admins() {
  const { profile: me, isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'admin' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*, roles(name, level)').order('created_at');
    setAdmins((data || []).filter((p) => (p.roles?.level || 0) >= 1));
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

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
        <h3 style={{ color: '#fff' }}>Access Denied</h3>
        <p>Only super administrators can manage admins.</p>
      </div>
    );
  }

  const openAdmin = (a) => {
    setActive(a);
    setDragY(0);
  };

  const promote = async (uid, roleName) => {
    setBusy(true);
    const target = admins.find((a) => a.id === uid);
    const { data: role } = await supabase.from('roles').select('id, name, level').eq('name', roleName).single();
    if (!role) { setBusy(false); alert('Role not found'); return; }

    // Optimistic
    setAdmins((old) => old.map((a) => a.id === uid ? { ...a, roles: role } : a));
    setActive(null);

    const { error } = await supabase.from('profiles').update({ role_id: role.id }).eq('id', uid);
    if (error) {
      setBusy(false);
      alert('Failed: ' + error.message);
      load();
      return;
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: me.id, action: 'change_role', target_type: 'profile', target_id: uid,
      details: { new_role: roleName, previous: target?.roles?.name },
    });

    setBusy(false);
    setMsg(`Role updated to ${roleLabel(roleName)}`);
    setTimeout(() => setMsg(''), 2500);
  };

  const demote = async (uid) => {
    await promote(uid, 'student');
    // remove from list if they're no longer an admin
    setAdmins((old) => old.filter((a) => a.id !== uid || a.id === me.id));
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || 'Failed');
        setBusy(false);
        return;
      }
      setMsg('Admin created successfully');
      setForm({ email: '', password: '', full_name: '', role: 'admin' });
      setCreateOpen(false);
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HERO */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 28px', gap: 12,
      }}>
        <ShieldIcon width={72} height={72} />
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
          Admins
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)',
          textAlign: 'center', maxWidth: 320, lineHeight: 1.5,
        }}>
          {admins.length} {admins.length === 1 ? 'admin' : 'admins'} · manage roles and access
        </div>
      </div>

      {/* ACTION ROW */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => { setErr(''); setCreateOpen(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 18,
            width: '100%', padding: '20px 16px',
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--border)',
            color: '#fff', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 5, background: '#3b82f6', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>Create new admin</span>
          <span style={{ display: 'inline-flex', color: 'var(--text-3)', opacity: 0.5 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      </div>

      {/* MESSAGES */}
      {msg && (
        <div style={{ margin: '16px 20px 0', background: 'rgba(34,197,94,.15)', color: '#22c55e', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
          {msg}
        </div>
      )}

      {/* ADMIN LIST */}
      <div style={{
        padding: '20px 20px 8px',
        fontSize: 12, fontWeight: 600, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: 1,
      }}>
        Current administrators
      </div>

      {loading && <div className="state">Loading…</div>}

      {!loading && admins.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No admins yet
        </div>
      )}

      {!loading && admins.map((a) => {
        const roleName = a.roles?.name || 'student';
        const roleColor = ROLE_COLORS[roleName] || '#6d7382';
        const isMe = a.id === me.id;
        return (
          <button
            key={a.id}
            onClick={() => openAdmin(a)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', padding: '14px 20px',
              background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--border)',
              color: '#fff', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 24,
              background: 'var(--surface-2)', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {a.avatar_url ? (
                <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <UserIcon width={22} height={22} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 500, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {a.full_name || 'Unknown'}{isMe && <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 6 }}>(you)</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 3, background: roleColor,
                }} />
                {roleLabel(roleName)}
              </div>
            </div>
            <ChevronRightIcon width={18} height={18} style={{ opacity: 0.4, flexShrink: 0 }} />
          </button>
        );
      })}

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
                  width: 72, height: 72, borderRadius: 36,
                  background: 'var(--surface-2)', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active.avatar_url ? (
                    <img src={active.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon width={32} height={32} />
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                  {active.full_name || 'Unknown'}
                </div>
                {active.email && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                    {active.email}
                  </div>
                )}
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  color: ROLE_COLORS[active.roles?.name] || '#6d7382',
                  marginTop: 8, letterSpacing: 0.6,
                }}>
                  {roleLabel(active.roles?.name)}
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

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {active.id === me.id ? (
                  <div style={{
                    padding: 14, background: 'var(--surface-2)',
                    borderRadius: 12, fontSize: 13,
                    color: 'var(--text-3)', textAlign: 'center',
                  }}>
                    This is your account — no changes allowed
                  </div>
                ) : (
                  <>
                    {active.roles?.name !== 'moderator' && (
                      <button
                        onClick={() => promote(active.id, 'moderator')}
                        disabled={busy}
                        style={actionBtn('var(--surface-2)', '#3b82f6')}
                      >
                        <ShieldCheckIcon width={20} height={20} />
                        Make moderator
                      </button>
                    )}
                    {active.roles?.name !== 'admin' && (
                      <button
                        onClick={() => promote(active.id, 'admin')}
                        disabled={busy}
                        style={actionBtn('var(--surface-2)', '#f97316')}
                      >
                        <ShieldCheckIcon width={20} height={20} />
                        Make admin
                      </button>
                    )}
                    {active.roles?.name !== 'super_admin' && (
                      <button
                        onClick={() => promote(active.id, 'super_admin')}
                        disabled={busy}
                        style={actionBtn('var(--surface-2)', '#ef4444')}
                      >
                        <ShieldCheckIcon width={20} height={20} />
                        Make super admin
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('Demote to student? They will lose admin access.')) demote(active.id); }}
                      disabled={busy}
                      style={actionBtn('transparent', '#ef4444', '1.5px solid #ef4444')}
                    >
                      <BanIcon width={20} height={20} />
                      Demote to student
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* CREATE DRAWER */}
      {createOpen && (
        <>
          <div
            onClick={() => setCreateOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 300 }}
          />
          <form
            onSubmit={createAdmin}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              maxHeight: '90vh', background: 'var(--surface)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 310, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', animation: 'drawer-slide-up 250ms ease-out',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 20px 20px',
              borderBottom: '1px solid var(--border)',
              position: 'relative',
            }}>
              <ShieldIcon width={56} height={56} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 12 }}>
                Create new admin
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, textAlign: 'center' }}>
                New account with elevated privileges
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                style={{
                  position: 'absolute', top: 4, right: 12,
                  background: 'transparent', border: 'none',
                  color: '#fff', padding: 8, cursor: 'pointer',
                }}
              >
                <XIcon width={22} height={22} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {err && (
                <div style={{ background: 'var(--brand-soft)', color: 'var(--brand)', padding: 12, borderRadius: 10, fontSize: 13 }}>
                  {err}
                </div>
              )}
              <FormInput
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                required
              />
              <FormInput
                type="password"
                placeholder="Temporary password (min 8)"
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                required
                minLength={8}
              />
              <FormInput
                type="text"
                placeholder="Full name"
                value={form.full_name}
                onChange={(v) => setForm({ ...form, full_name: v })}
                required
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={{
                  width: '100%', padding: 16,
                  background: 'var(--surface-2)', border: 'none',
                  borderRadius: 14, color: '#fff',
                  fontSize: 15, fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>

              <button
                type="submit"
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', padding: 16, marginTop: 8,
                  background: 'var(--brand)', color: '#fff',
                  border: 'none', borderRadius: 16,
                  fontSize: 15, fontWeight: 600,
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                {busy ? 'Creating…' : 'Create admin'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function FormInput({ type, placeholder, value, onChange, required, minLength }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      minLength={minLength}
      style={{
        width: '100%', padding: 16,
        background: 'var(--surface-2)', border: 'none',
        borderRadius: 14, color: '#fff',
        fontSize: 15, fontFamily: 'inherit',
        outline: 'none',
      }}
    />
  );
}

const actionBtn = (bg, color, border) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '16px', background: bg, color,
  border: border || 'none', borderRadius: 14,
  fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
});
