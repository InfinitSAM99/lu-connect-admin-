import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  DashboardIcon, ClockIcon, UsersIcon, FileTextIcon, MessageIcon,
  AlertTriangleIcon, MegaphoneIcon, CalendarIcon, BuildingIcon,
  ChartIcon, ShieldIcon, ClipboardIcon, CreditCardIcon,
  SunIcon, MoonIcon, MenuIcon, LogoutIcon, XIcon, ChevronRightIcon,
} from './Icons.jsx';

const SECTIONS = [
  {
    title: 'Overview',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    ],
  },
  {
    title: 'Moderation',
    links: [
      { to: '/pending-approvals', label: 'Pending Approvals', icon: ClockIcon },
      { to: '/students', label: 'Students', icon: UsersIcon },
      { to: '/reports', label: 'Reports', icon: AlertTriangleIcon },
    ],
  },
  {
    title: 'Content',
    links: [
      { to: '/posts', label: 'Posts', icon: FileTextIcon },
      { to: '/comments', label: 'Comments', icon: MessageIcon },
      { to: '/announcements', label: 'Announcements', icon: MegaphoneIcon },
      { to: '/events', label: 'Events', icon: CalendarIcon },
      { to: '/groups', label: 'Groups', icon: BuildingIcon },
    ],
  },
  {
    title: 'Insights',
    links: [
      { to: '/analytics', label: 'Analytics', icon: ChartIcon },
    ],
  },
  {
    title: 'Management',
    links: [
      { to: '/admins', label: 'Admins', icon: ShieldIcon, superOnly: true },
      { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardIcon },
      { to: '/payments', label: 'Payments', icon: CreditCardIcon },
    ],
  },
];

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/pending-approvals': 'Pending Approvals',
  '/students': 'Students',
  '/posts': 'Posts',
  '/comments': 'Comments',
  '/reports': 'Reports',
  '/announcements': 'Announcements',
  '/events': 'Events',
  '/groups': 'Groups',
  '/analytics': 'Analytics',
  '/admins': 'Admins',
  '/audit-logs': 'Audit Logs',
  '/payments': 'Payments',
};

export default function Layout() {
  const { profile, signOut, isSuperAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentTitle = PAGE_TITLES[location.pathname] || 'Admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className={'admin-sidebar' + (open ? ' open' : '')}>
        <div className="admin-brand-row">
          <div className="brand">LU CONNECT</div>
          <div className="brand-sub">ADMIN</div>
        </div>

        <nav className="admin-nav">
          {SECTIONS.map((section) => {
            const visibleLinks = section.links.filter(
              (l) => !l.superOnly || isSuperAdmin
            );
            if (visibleLinks.length === 0) return null;
            return (
              <div key={section.title} className="nav-section">
                <div className="nav-section-title">{section.title}</div>
                {visibleLinks.map((l) => {
                  const Icon = l.icon;
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                      onClick={() => setOpen(false)}
                    >
                      <Icon width={18} height={18} />
                      <span style={{ flex: 1 }}>{l.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-mini">
            <img
              className="avatar"
              width={32}
              height={32}
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || 'A'}`}
              alt=""
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="admin-user-name">{profile?.full_name || 'Admin'}</div>
              <div className="admin-user-role">
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10 }}
            onClick={handleSignOut}
          >
            <LogoutIcon width={16} height={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="btn btn-ghost admin-menu-btn"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <XIcon width={20} height={20} /> : <MenuIcon width={20} height={20} />}
          </button>

          <div className="admin-topbar-title">{currentTitle}</div>

          <div style={{ flex: 1 }} />

          <button
            className="btn btn-ghost"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
          </button>

          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{ padding: 4 }}
              aria-label="User menu"
            >
              <img
                className="avatar"
                width={28}
                height={28}
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || 'A'}`}
                alt=""
              />
            </button>

            {userMenuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="admin-user-menu">
                  <div className="admin-user-menu-head">
                    <img
                      className="avatar"
                      width={36}
                      height={36}
                      src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name || 'A'}`}
                      alt=""
                    />
                    <div style={{ minWidth: 0 }}>
                      <div className="admin-user-name">{profile?.full_name || 'Admin'}</div>
                      <div className="admin-user-role">
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                      </div>
                    </div>
                  </div>
                  <button
                    className="admin-user-menu-item"
                    onClick={handleSignOut}
                  >
                    <LogoutIcon width={16} height={16} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
