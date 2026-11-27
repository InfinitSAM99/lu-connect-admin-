import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import {
  XIcon, CheckCircleIcon, ChevronRightIcon, MenuIcon, UserIcon, MailIcon, ClipboardIcon
} from '../components/Icons.jsx';

const ROLE_COLORS = {
  super_admin: '#ef4444',
  admin: '#f97316',
  moderator: '#3b82f6',
  student: '#6d7382',
};

export default function Admins() {
  const { profile: me, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, roles(name, level)')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
        <h3 style={{ color: '#fff' }}>Access Denied</h3>
        <p>Only super administrators can manage roles.</p>
      </div>
    );
  }

  const changeRole = async (userId, roleName) => {
    setBusy(true);
    const { data: role } = await supabase.from('roles').select('id, name, level').eq('name', roleName).single();
    if (!role) { setBusy(false); return; }

    const { error } = await supabase.from('profiles').update({ role_id: role.id }).eq('id', userId);
    if (error) {
      alert('Failed: ' + error.message);
    } else {
      setMsg(`Role updated to ${roleName.replace(/_/g, ' ')}`);
      setTimeout(() => setMsg(''), 2500);
      await supabase.from('admin_audit_logs').insert({
        admin_id: me.id, action: 'change_role', target_type: 'profile', target_id: userId,
        details: { new_role: roleName },
      });
      loadUsers();
      setActiveUser(null);
    }
    setBusy(false);
  };

  const adminList = users.filter(u => (u.roles?.level || 0) >= 1).sort((a, b) => (b.roles?.level || 0) - (a.roles?.level || 0));
  const studentList = users.filter(u => (u.roles?.level || 0) === 0);

  return (
    <div style={{ paddingBottom: 40, background: '#000', minHeight: '100vh' }}>
      
      {/* HEADER & LOGO */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 20px', position: 'relative' }}>
        
        <button
          onClick={() => setAddOpen(true)}
          style={{
            position: 'absolute', top: 24, right: 20, background: '#1a1a1a', border: '1px solid #333',
            color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
          }}
        >
          <MenuIcon width={14} height={14} /> Add
        </button>

        <img src="/infinit-logo.png" alt="Infinit Co" style={{ width: 160, height: 160, objectFit: 'contain', marginBottom: 16 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 300 }}>
          <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
          <div style={{ fontSize: 12, letterSpacing: 4, color: '#6d7382', textTransform: 'uppercase', fontWeight: 700 }}>Infinit Co</div>
          <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
        </div>
      </div>

      {msg && (
        <div style={{ margin: '0 20px 20px', background: 'rgba(34,197,94,.15)', color: '#22c55e', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 500, textAlign: 'center' }}>
          {msg}
        </div>
      )}

      {/* CLEAN LIST OF ADMINS */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Team Members ({adminList.length})
        </div>

        {loading && <div className="state">Loading team…</div>}

        {!loading && adminList.map((u) => (
          <button
            key={u.id}
            onClick={() => setActiveUser(u)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 0', borderBottom: '1px solid #1f1f1f', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
          >
            <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name || 'U'}`} alt="" style={{ width: 44, height: 44, borderRadius: 22, background: '#1a1a1a' }} />
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, flex: 1 }}>
              {u.full_name || 'Unknown'}
            </div>
            <ChevronRightIcon width={16} height={16} style={{ color: '#333' }} />
          </button>
        ))}
      </div>

      {/* CLEAN ADD STUDENT DRAWER */}
      {addOpen && (
        <>
          <div onClick={() => setAddOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#000', borderTopLeftRadius: 28, borderTopRightRadius: 28, zIndex: 101, height: '85vh', display: 'flex', flexDirection: 'column', animation: 'slide-up 250ms ease-out' }}>
            <div style={{ padding: '20px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Select Student</div>
              <button onClick={() => setAddOpen(false)} style={{ background: '#1f1f1f', border: 'none', borderRadius: 20, padding: 8, color: '#fff' }}><XIcon width={16} height={16} /></button>
            </div>
            
            <div style={{ padding: '0 20px 10px' }}>
              <div style={{ background: '#111', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserIcon width={18} height={18} style={{ color: '#6d7382' }} />
                <input type="text" placeholder="Search by name..." style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontSize: 15 }} />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 40px' }}>
              {studentList.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setAddOpen(false); setActiveUser(u); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 0', borderBottom: '1px solid #1f1f1f', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                >
                  <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name}`} style={{ width: 44, height: 44, borderRadius: 22 }} />
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, flex: 1 }}>
                    {u.full_name}
                  </div>
                  <ChevronRightIcon width={16} height={16} style={{ color: '#333' }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* PREMIUM USER DETAIL DRAWER */}
      {activeUser && (
        <>
          <div onClick={() => setActiveUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#000', borderTopLeftRadius: 28, borderTopRightRadius: 28, zIndex: 101, maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'slide-up 250ms ease-out' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
              <span style={{ 
                color: ROLE_COLORS[activeUser.roles?.name] || '#6d7382', 
                fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 
              }}>
                {activeUser.roles?.name?.replace(/_/g, ' ') || 'Student'}
              </span>
              <button onClick={() => setActiveUser(null)} style={{ background: '#1a1a1a', border: 'none', borderRadius: 20, padding: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XIcon width={16} height={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 24px 32px' }}>
              <img src={activeUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${activeUser.full_name}`} style={{ width: 90, height: 90, borderRadius: 45, marginBottom: 16 }} />
              <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{activeUser.full_name}</div>
              <div style={{ color: '#6d7382', fontSize: 14, marginTop: 4 }}>@{activeUser.username || 'user'}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 40px' }}>
              
              {/* UNBOXED INFO ROWS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6d7382" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></svg>
                  <div>
                    <div style={{ fontSize: 11, color: '#6d7382', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>Email</div>
                    <div style={{ color: '#fff', fontSize: 15 }}>{activeUser.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <ClipboardIcon width={24} height={24} style={{ color: '#6d7382' }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#6d7382', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>User ID</div>
                    <div style={{ color: '#fff', fontSize: 15 }}>{activeUser.id}</div>
                  </div>
                </div>
              </div>

              {/* ROLE MANAGEMENT */}
              {activeUser.roles?.name === 'super_admin' ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#ef4444', fontWeight: 700, fontSize: 16 }}>
                  Super Admin Account (Protected)
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6d7382', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                    Change Role
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {['moderator', 'admin'].map((role) => {
                      const isCurrent = (activeUser.roles?.name || 'student') === role;
                      return (
                        <button
                          key={role}
                          onClick={() => changeRole(activeUser.id, role)}
                          disabled={busy || isCurrent}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: isCurrent ? 'rgba(239,68,68,0.05)' : 'transparent',
                            border: 'none', padding: '16px 0', color: isCurrent ? '#ef4444' : '#fff',
                            fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: (busy || isCurrent) ? 1 : 0.8
                          }}
                        >
                          <span style={{ textTransform: 'capitalize' }}>{role.replace(/_/g, ' ')}</span>
                          {isCurrent && <CheckCircleIcon width={24} height={24} />}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 32 }}>
                    <button
                      onClick={() => changeRole(activeUser.id, 'student')}
                      disabled={busy}
                      style={{ width: '100%', background: 'transparent', color: '#ef4444', border: '1px solid #333', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Demote to Student
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
