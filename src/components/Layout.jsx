import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/pending-approvals', label: 'Pending Approvals', icon: '🕓' },
  { to: '/students', label: 'Students', icon: '👥' },
  { to: '/posts', label: 'Posts', icon: '📝' },
  { to: '/comments', label: 'Comments', icon: '💬' },
  { to: '/reports', label: 'Reports', icon: '🚨' },
  { to: '/announcements', label: 'Announcements', icon: '📢' },
  { to: '/events', label: 'Events', icon: '📅' },
  { to: '/groups', label: 'Groups', icon: '🏛' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/admins', label: 'Admins', icon: '🛡' },
  { to: '/audit-logs', label: 'Audit Logs', icon: '📋' },
  { to: '/payments', label: 'Payments', icon: '💳' },
];

export default function Layout() {
  const { profile, signOut, isSuperAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="admin-shell">
      <aside className={'admin-sidebar' + (open ? ' open' : '')}>
        <div className="brand" style={{ padding: '6px 12px 20px' }}>LU CONNECT Admin</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {links.filter((l) => l.to !== '/admins' || isSuperAdmin).map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              onClick={() => setOpen(false)}>
              <span>{l.icon}</span><span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ position: 'absolute', bottom: 16, left: 10, right: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 12px' }}>
            {profile?.full_name}
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={async () => { await signOut(); navigate('/login'); }}>
            🚪 Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="btn btn-ghost" onClick={() => setOpen(!open)} style={{ display: 'flex' }}>
            <span style={{ fontSize: 18 }}>☰</span>
          </button>
          <div className="brand" style={{ display: 'inline' }}>LU CONNECT Admin</div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>
        <div className="admin-content"><Outlet /></div>
      </div>
    </div>
  );
}
