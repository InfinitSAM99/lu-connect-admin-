import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { probeRealtimeTransport } from '../lib/realtimeDiag';
import QuickActions from './QuickActions';
import {
  DashboardIcon, ChartIcon, ClockIcon, UsersIcon, FileTextIcon, MessageIcon,
  AlertTriangleIcon, MegaphoneIcon, CalendarIcon, BuildingIcon,
  ShieldIcon, ClipboardIcon, CreditCardIcon, RocketIcon,
  MenuIcon, LogoutIcon, ShieldCheckIcon,
} from './Icons.jsx';

const SECTIONS = [
  { title: 'Overview', links: [
    { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon, role: 'moderator' },
    { to: '/team-chat', label: 'Team Chat', icon: MessageIcon, role: 'moderator' },
    { to: '/visitors', label: 'Visitors', icon: ChartIcon, role: 'admin' },
    { to: '/ai', label: 'AI Assistant', icon: ChartIcon, role: 'admin' },
  ]},
  { title: 'Moderation', links: [
    { to: '/moderation', label: 'Reports Queue', icon: AlertTriangleIcon, role: 'moderator' },
    { to: '/reports', label: 'User Reports', icon: AlertTriangleIcon, role: 'moderator' },
    { to: '/pending-approvals', label: 'Pending Approvals', icon: ClockIcon, role: 'admin' },
    { to: '/security-threats', label: 'Security Center', icon: ShieldCheckIcon, role: 'admin' },
    { to: '/recovery-messages', label: 'Recovery Messages', icon: MessageIcon, role: 'moderator' },
    { to: '/help-desk', label: 'Help Desk', icon: MessageIcon, role: 'moderator' },
    { to: '/appeals', label: 'Appeals', icon: ShieldCheckIcon, role: 'moderator' },
  ]},
  { title: 'People', links: [
    { to: '/students', label: 'Students', icon: UsersIcon, role: 'admin' },
    { to: '/admins', label: 'Admins', icon: ShieldIcon, role: 'super_admin' },
  ]},
  { title: 'Content', links: [
    { to: '/posts', label: 'Posts', icon: FileTextIcon, role: 'moderator' },
    { to: '/comments', label: 'Comments', icon: MessageIcon, role: 'moderator' },
    { to: '/announcements', label: 'Announcements', icon: MegaphoneIcon, role: 'admin' },
    { to: '/events', label: 'Events', icon: CalendarIcon, role: 'admin' },
    { to: '/groups', label: 'Groups', icon: BuildingIcon, role: 'admin' },
  ]},
  { title: 'System', links: [
    
    { to: '/payments', label: 'Payments', icon: CreditCardIcon, role: 'super_admin' },
    { to: '/pricing', label: 'Pricing & Peaks', icon: CreditCardIcon, role: 'super_admin' },
    { to: '/admin-codes', label: 'Access Codes', icon: ShieldCheckIcon, role: 'super_admin' },
    { to: '/otp-manager', label: 'OTP Manager', icon: ShieldCheckIcon, role: 'super_admin' },
    { to: '/settings', label: 'Settings', icon: ShieldIcon, role: 'super_admin' },
    { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardIcon, role: 'admin' },
  ]},
];

export default function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { probeRealtimeTransport(); }, []);

  const myRoleName = profile?.roles?.name || 'student';
  const isChatting = location.pathname.startsWith('/team-chat/') && location.pathname !== '/team-chat';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const canSee = (requiredRole) => {
    if (myRoleName === 'super_admin') return true;
    if (myRoleName === 'admin') return requiredRole === 'moderator' || requiredRole === 'admin';
    if (myRoleName === 'moderator') return requiredRole === 'moderator';
    return false;
  };

  return (
    <div className="admin-shell">
      <aside 
        className={'admin-sidebar' + (sidebarOpen ? ' open' : '')} 
        style={{ display: isChatting && !sidebarOpen ? 'none' : 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
      >
        <div style={{ padding: '24px 20px 32px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, border: '2px solid #ef4444', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18 }}>LU</div>
          <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 20, letterSpacing: 1 }}>LU CONNECT</span>
        </div>
        
        {/* FIX: Added flex: 1, overflowY: auto, paddingBottom: 100 */}
        <nav className="admin-nav" style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
          {SECTIONS.map((section) => {
            const visibleLinks = section.links.filter((l) => canSee(l.role));
            if (visibleLinks.length === 0) return null;
            
            return (
              <div key={section.title} className="nav-section">
                <div className="nav-section-title">{section.title}</div>
                {visibleLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                    style={{ padding: '14px 16px', marginBottom: '4px', color: '#e5e5e5', borderRadius: '12px' }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <l.icon width={18} height={18} />
                    <span style={{ flex: 1 }}>{l.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        
        <div className="admin-sidebar-footer" style={{ flexShrink: 0 }}>
          <div className="admin-user-mini">
            <img className="avatar" width={32} height={32} src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || 'A'}`} alt="" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="admin-user-name">{profile?.full_name || 'Admin'}</div>
              <div className="admin-user-role" style={{ textTransform: 'capitalize' }}>
                {myRoleName.replace('_', ' ')}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 10 }} onClick={handleSignOut}>
            <LogoutIcon width={16} height={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main" style={{ paddingBottom: isChatting ? 0 : undefined }}>
        {!isChatting && (
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', paddingTop: 'calc(16px + env(safe-area-inset-top))',
            background: '#000000', position: 'sticky', top: 0, zIndex: 100,
            borderBottom: '1px solid #1a1a1a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, border: '2px solid #ef4444', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16 }}>LU</div>
              <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>LU CONNECT</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <QuickActions />
              <button onClick={() => setSidebarOpen(true)} style={{ background: '#111', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                <div style={{ width: 18, height: 2, background: '#fff' }}></div>
                <div style={{ width: 18, height: 2, background: '#fff' }}></div>
                <div style={{ width: 18, height: 2, background: '#fff' }}></div>
              </button>
            </div>
          </header>
        )}

        <div className="admin-content" style={{ padding: isChatting ? 0 : undefined, height: isChatting ? '100vh' : undefined }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
