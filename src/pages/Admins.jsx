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

// Official Google Logo SVG
const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function Admins() {
  const { profile: me, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [addMode, setAddMode] = useState('select'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newRole, setNewRole] = useState('moderator');
  
  const [pendingRole, setPendingRole] = useState(null);
  const [showRoleOptions, setShowRoleOptions] = useState(false);

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

  const openUserDrawer = (user) => {
    setActiveUser(user);
    setPendingRole(null); 
    setShowRoleOptions(false);
  };

  const saveRoleChange = async (roleName) => {
    if (!activeUser) return;
    setBusy(true);
    
    try {
      const { data: role } = await supabase.from('roles').select('id, name, level').eq('name', roleName).single();
      if (!role) throw new Error("Role not found");

      const { error } = await supabase.from('profiles').update({ role_id: role.id }).eq('id', activeUser.id);
      if (error) throw error;

      setMsg(`Role updated to ${roleName.replace(/_/g, ' ')}`);
      setTimeout(() => setMsg(''), 2500);
      
      await supabase.from('admin_audit_logs').insert({
        admin_id: me.id, action: 'change_role', target_type: 'profile', target_id: activeUser.id,
        details: { new_role: roleName },
      });
      
      loadUsers();
      setActiveUser(null);
      setPendingRole(null);
      setShowRoleOptions(false);
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const banAdmin = async () => {
    if (!activeUser) return;
    if (!window.confirm(`Are you sure you want to ban ${activeUser.full_name} from the Admin App? They will still be able to use the student app.`)) return;
    
    setBusy(true);
    try {
      const { error } = await supabase.from('profiles').update({ is_admin_banned: true }).eq('id', activeUser.id);
      if (error) throw error;

      setMsg(`${activeUser.full_name} has been banned from Admin App.`);
      setTimeout(() => setMsg(''), 3000);
      
      await supabase.from('admin_audit_logs').insert({
        admin_id: me.id, action: 'ban_admin', target_type: 'profile', target_id: activeUser.id,
        details: { banned: true },
      });

      loadUsers();
      setActiveUser(null);
    } catch (err) {
      alert("Failed to ban: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setNewRole('moderator');
    setAddMode('create');
  };

  const promoteStudent = async () => {
    if (!selectedStudent) return;
    setBusy(true);
    
    try {
      const { data: role } = await supabase.from('roles').select('id, name, level').eq('name', newRole).single();
      if (!role) throw new Error("Role not found");

      const { error } = await supabase.from('profiles').update({ role_id: role.id }).eq('id', selectedStudent.id);
      if (error) throw error;

      setMsg(`${selectedStudent.full_name} is now a ${newRole}`);
      setTimeout(() => setMsg(''), 3000);
      
      setSelectedStudent(null);
      setAddOpen(false);
      setAddMode('select');
      loadUsers();
      
    } catch (err) {
      alert("Failed to promote user: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const adminList = users.filter(u => (u.roles?.level || 0) >= 1).sort((a, b) => (b.roles?.level || 0) - (a.roles?.level || 0));
  const studentList = users.filter(u => (u.roles?.level || 0) === 0);

  return (
    <div style={{ paddingBottom: 40, background: '#000', minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 20px', position: 'relative' }}>
        <button
          onClick={() => { setAddOpen(true); setAddMode('select'); setSelectedStudent(null); }}
          style={{ position: 'absolute', top: 24, right: 20, background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
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

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Team Members ({adminList.length})
        </div>

        {loading && <div className="state">Loading team…</div>}

        {!loading && adminList.map((u) => (
          <button
            key={u.id}
            onClick={() => openUserDrawer(u)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 0', borderBottom: '1px solid #1f1f1f', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
          >
            <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name || 'U'}`} alt="" style={{ width: 44, height: 44, borderRadius: 22, background: '#1a1a1a' }} />
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, flex: 1 }}>{u.full_name || 'Unknown'}</div>
            {u.is_admin_banned && <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>BANNED</span>}
            <ChevronRightIcon width={16} height={16} style={{ color: '#333' }} />
          </button>
        ))}
      </div>

      {/* ADD DRAWER */}
      {addOpen && (
        <>
          <div onClick={() => setAddOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#000', borderTopLeftRadius: 28, borderTopRightRadius: 28, zIndex: 101, height: '85vh', display: 'flex', flexDirection: 'column', animation: 'slide-up 250ms ease-out' }}>
            <div style={{ padding: '20px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{addMode === 'select' ? 'Select Student' : 'Promote to Team'}</div>
              <button onClick={() => { setAddOpen(false); setAddMode('select'); }} style={{ background: '#1f1f1f', border: 'none', borderRadius: 20, padding: 8, color: '#fff' }}><XIcon width={16} height={16} /></button>
            </div>

            {addMode === 'select' ? (
              <>
                <div style={{ padding: '0 20px 10px' }}>
                  <div style={{ background: '#111', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserIcon width={18} height={18} style={{ color: '#6d7382' }} />
                    <input type="text" placeholder="Search by name..." style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontSize: 15 }} />
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 40px' }}>
                  {studentList.map(u => (
                    <button key={u.id} onClick={() => handleSelectStudent(u)} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 0', borderBottom: '1px solid #1f1f1f', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                      <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name}`} style={{ width: 44, height: 44, borderRadius: 22 }} />
                      <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, flex: 1 }}>{u.full_name}</div>
                      <ChevronRightIcon width={16} height={16} style={{ color: '#333' }} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#111', padding: 16, borderRadius: 12, border: '1px solid #333', marginBottom: 10 }}>
                  <img src={selectedStudent?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedStudent?.full_name}`} style={{ width: 50, height: 50, borderRadius: 25 }} />
                  <div>
                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{selectedStudent?.full_name}</div>
                    <div style={{ color: '#6d7382', fontSize: 13 }}>{selectedStudent?.email}</div>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#6d7382', fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Select Role</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 10, padding: 14, color: '#fff', outline: 'none', fontSize: 15, appearance: 'none' }}>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button onClick={promoteStudent} disabled={busy} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 12, padding: '16px', fontSize: 16, fontWeight: 700, marginTop: 20, cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
                  {busy ? 'Promoting...' : `Promote to ${newRole}`}
                </button>
                <button onClick={() => setAddMode('select')} style={{ background: 'transparent', color: '#6d7382', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 10 }}>Back to Student List</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* PREMIUM USER DETAIL DRAWER (TALLER) */}
      {activeUser && (
        <>
          <div onClick={() => setActiveUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#000', borderTopLeftRadius: 28, borderTopRightRadius: 28, zIndex: 101, height: '92vh', display: 'flex', flexDirection: 'column', animation: 'slide-up 250ms ease-out' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0' }}>
              <span style={{ color: ROLE_COLORS[activeUser.roles?.name] || '#6d7382', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                {activeUser.roles?.name?.replace(/_/g, ' ') || 'Student'}
              </span>
              <button onClick={() => setActiveUser(null)} style={{ background: '#1a1a1a', border: 'none', borderRadius: 20, padding: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XIcon width={16} height={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 32px' }}>
              <img src={activeUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${activeUser.full_name}`} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 16 }} />
              <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{activeUser.full_name}</div>
              <div style={{ color: '#6d7382', fontSize: 14, marginTop: 4 }}>@{activeUser.username || 'user'}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 40px', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <GoogleIcon />
                <div style={{ color: '#fff', fontSize: 16 }}>{activeUser.email}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                <ClipboardIcon width={24} height={24} style={{ color: '#6d7382' }} />
                <div style={{ color: '#fff', fontSize: 15 }}>{activeUser.id}</div>
              </div>

              {activeUser.roles?.name === 'super_admin' ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#ef4444', fontWeight: 700, fontSize: 16 }}>Super Admin Account (Protected)</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                  
                  {/* CURRENT ROLE BUTTON (DISABLED) */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6d7382', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Current Role</div>
                    <button disabled style={{ width: '100%', background: '#111', border: '1px solid #333', padding: '16px', borderRadius: 12, color: '#6d7382', fontSize: 16, fontWeight: 600, textAlign: 'left', textTransform: 'capitalize' }}>
                      {activeUser.roles?.name?.replace(/_/g, ' ') || 'Student'}
                    </button>
                  </div>

                  {/* CHANGE ROLE BUTTON / OPTIONS */}
                  {!showRoleOptions ? (
                    <button
                      onClick={() => setShowRoleOptions(true)}
                      style={{ width: '100%', background: 'transparent', color: '#fff', border: '1px solid #333', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Change Role
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#0a0a0a', padding: 16, borderRadius: 12, border: '1px solid #1f1f1f' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                         <div style={{ fontSize: 12, fontWeight: 700, color: '#6d7382', textTransform: 'uppercase', letterSpacing: 1 }}>Select New Role</div>
                         <button onClick={() => setShowRoleOptions(false)} style={{ background: 'none', border: 'none', color: '#6d7382', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      </div>
                      
                      {['moderator', 'admin'].map((role) => {
                        const isCurrent = (activeUser.roles?.name || 'student') === role;
                        return (
                          <button
                            key={role}
                            onClick={() => setPendingRole(role)}
                            disabled={busy || isCurrent}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              background: pendingRole === role ? 'rgba(239,68,68,0.1)' : 'transparent',
                              border: pendingRole === role ? '1px solid rgba(239,68,68,0.5)' : '1px solid #1f1f1f',
                              padding: '16px', borderRadius: 8, color: isCurrent ? '#6d7382' : '#fff',
                              fontSize: 15, fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            <span style={{ textTransform: 'capitalize' }}>{role.replace(/_/g, ' ')} {isCurrent && '(Current)'}</span>
                            {pendingRole === role && <CheckCircleIcon width={20} height={20} style={{ color: '#ef4444' }} />}
                          </button>
                        );
                      })}
                      
                      {pendingRole && (
                        <button
                          onClick={() => saveRoleChange(pendingRole)}
                          disabled={busy}
                          style={{ width: '100%', background: '#ef4444', color: '#fff', border: 'none', padding: '16px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}
                        >
                          {busy ? 'Saving...' : `Confirm Change to ${pendingRole}`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* DEMOTE BUTTON */}
                  <button
                    onClick={() => saveRoleChange('student')}
                    disabled={busy}
                    style={{ width: '100%', background: 'transparent', color: '#ef4444', border: '1px solid #333', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}
                  >
                    Demote to Student
                  </button>
                  
                  {/* BAN FROM ADMIN APP BUTTON */}
                  {!activeUser.is_admin_banned && (
                    <button
                      onClick={banAdmin}
                      disabled={busy}
                      style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Ban from Admin App
                    </button>
                  )}
                  {activeUser.is_admin_banned && (
                    <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: 700, fontSize: 14, padding: 16 }}>
                      Banned from Admin App
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
