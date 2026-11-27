import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { realtime } from '../lib/realtime';
import { probeRealtimeTransport } from '../lib/realtimeDiag';
import { App as CapApp } from '@capacitor/app';
import QuickActions from './QuickActions';

import {
  DashboardIcon, ChartIcon, ClockIcon, UsersIcon, FileTextIcon, MessageIcon,
  AlertTriangleIcon, MegaphoneIcon, CalendarIcon, BuildingIcon,
  ShieldIcon, ClipboardIcon, CreditCardIcon, RocketIcon,
  MenuIcon, LogoutIcon, XIcon, ShieldCheckIcon,
} from './Icons.jsx';

const SECTIONS = [
  { title: 'Overview', links: [ { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon }, { to: '/visitors', label: 'Visitors', icon: ChartIcon }, { to: '/ai', label: 'AI Assistant', icon: ChartIcon } ] },
  { title: 'Moderation', links: [ { special: 'reports', label: 'Reports', icon: AlertTriangleIcon }, { to: '/pending-approvals', label: 'Pending Approvals', icon: ClockIcon }, { to: '/security-threats', label: 'Security Center', icon: ShieldCheckIcon }, { to: '/recovery-messages', label: 'Recovery Messages', icon: MessageIcon }, { to: '/help-desk', label: 'Help Desk', icon: MessageIcon }, { to: '/appeals', label: 'Appeals', icon: ShieldCheckIcon } ] },
  { title: 'People', links: [ { to: '/students', label: 'Students', icon: UsersIcon }, { to: '/admins', label: 'Admins', icon: ShieldIcon }, { to: '/admins', label: 'Admins', icon: ShieldIcon } ] },
  { title: 'Content', links: [ { to: '/posts', label: 'Posts', icon: FileTextIcon }, { to: '/comments', label: 'Comments', icon: MessageIcon }, { to: '/announcements', label: 'Announcements', icon: MegaphoneIcon }, { to: '/events', label: 'Events', icon: CalendarIcon }, { to: '/groups', label: 'Groups', icon: BuildingIcon } ] },
  { title: 'System', links: [ { to: '/boosts', label: 'Boosts', icon: RocketIcon }, { to: '/payments', label: 'Payments', icon: CreditCardIcon }, { to: '/admin-codes', label: 'Access Codes', icon: ShieldCheckIcon }, { to: '/settings', label: 'Settings', icon: ShieldIcon }, { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardIcon } ] }
];

const BOTTOM_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/students', label: 'Students', icon: UsersIcon }, { to: '/admins', label: 'Admins', icon: ShieldIcon },
  { to: '/posts', label: 'Posts', icon: FileTextIcon },
  { to: '/moderation', label: 'Reports', icon: AlertTriangleIcon },
  { to: '__more__', label: 'More', icon: MenuIcon },
];

export default function Layout() {
  const location = useLocation();
  const { profile, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { probeRealtimeTransport(); }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      {/* ORIGINAL SIDEBAR */}
      <aside className={'admin-sidebar' + (sidebarOpen ? ' open' : '')}>
        {/* TOP LU LOGO (Same as header) */}
        <div style={{ padding: '24px 20px 32px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ 
            width: 36, height: 36, border: '2px solid #ef4444', borderRadius: 8, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: '#fff', fontWeight: 900, fontSize: 18 
          }}>
            LU
          </div>
          <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 20, letterSpacing: 1 }}>LU CONNECT</span>
        </div>
        <nav className="admin-nav">
          {SECTIONS.map((section) => {
            const visibleLinks = section.links.filter((l) => !l.superOnly || isSuperAdmin);
            if (visibleLinks.length === 0) return null;
            return (
              <div key={section.title} className="nav-section">
                <div className="nav-section-title">{section.title}</div>
                {visibleLinks.map((l) => (
                  <NavLink key={l.to || l.special} to={l.to || '/moderation'} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                      style={{ padding: '14px 16px', marginBottom: '4px', color: '#e5e5e5', borderRadius: '12px' }} onClick={() => setSidebarOpen(false)}>
                    <l.icon width={18} height={18} />
                    <span style={{ flex: 1 }}>{l.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-mini">
            <img className="avatar" width={32} height={32} src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || 'A'}`} alt="" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="admin-user-name">{profile?.full_name || 'Admin'}</div>
              <div className="admin-user-role">{isSuperAdmin ? 'Super Admin' : 'Admin'}</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 10 }} onClick={handleSignOut}>
            <LogoutIcon width={16} height={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        {/* NEW CUSTOM HEADER */}
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
            {/* Put the Bell component here in the future */}
            
            <QuickActions />
            <button onClick={() => setSidebarOpen(true)} style={{ background: '#111', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
              <div style={{ width: 18, height: 2, background: '#fff' }}></div>
              <div style={{ width: 18, height: 2, background: '#fff' }}></div>
              <div style={{ width: 18, height: 2, background: '#fff' }}></div>
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>

      {/* RESTORED BOTTOM NAV */}
    </div>
  );
}
