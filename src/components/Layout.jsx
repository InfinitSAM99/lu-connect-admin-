import { useState, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  DashboardIcon, ChartIcon, ClockIcon, UsersIcon, FileTextIcon, MessageIcon,
  AlertTriangleIcon, MegaphoneIcon, CalendarIcon, BuildingIcon,
  ShieldIcon, ClipboardIcon, CreditCardIcon, RocketIcon,
  MenuIcon, LogoutIcon, XIcon, ShieldCheckIcon,
} from './Icons.jsx';

const SECTIONS = [
  {
    title: 'Overview',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
      { to: '/ai', label: 'AI Assistant', icon: ChartIcon },
    ],
  },
  {
    title: 'Moderation',
    links: [
      { special: 'reports', label: 'Reports', icon: AlertTriangleIcon },
      { to: '/pending-approvals', label: 'Pending Approvals', icon: ClockIcon },
      { to: '/appeals', label: 'Appeals', icon: ShieldCheckIcon },
    ],
  },
  {
    title: 'People',
    links: [
      { to: '/students', label: 'Students', icon: UsersIcon },
      { to: '/admins', label: 'Admins', icon: ShieldIcon, superOnly: true },
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
    title: 'System',
    links: [
      { to: '/boosts', label: 'Boosts', icon: RocketIcon },
      { to: '/payments', label: 'Payments', icon: CreditCardIcon },
      { to: '/settings', label: 'Settings', icon: ShieldIcon },
      { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardIcon },
    ],
  },
];

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/ai': 'AI Assistant',
  '/moderation': 'AI Reports',
  '/appeals': 'Appeals',
  '/reports': 'Student Reports',
  '/pending-approvals': 'Pending Approvals',
  '/students': 'Students',
  '/admins': 'Admins',
  '/posts': 'Posts',
  '/comments': 'Comments',
  '/announcements': 'Announcements',
  '/events': 'Events',
  '/groups': 'Groups',
  '/boosts': 'Boosts',
  '/payments': 'Payments',
  '/settings': 'Settings',
  '/audit-logs': 'Audit Logs',
};

const BOTTOM_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/students', label: 'Students', icon: UsersIcon },
  { to: '/posts', label: 'Posts', icon: FileTextIcon },
  { to: '/moderation', label: 'Reports', icon: AlertTriangleIcon },
  { to: '__more__', label: 'More', icon: MenuIcon },
];

export default function Layout() {
  const { profile, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreDragY, setMoreDragY] = useState(0);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportsDragY, setReportsDragY] = useState(0);
  const moreStartYRef = useRef(0);
  const moreActiveRef = useRef(false);
  const reportsStartYRef = useRef(0);
  const reportsActiveRef = useRef(false);

  const onMoreTouchStart = (e) => {
    moreStartYRef.current = e.touches[0].clientY;
    moreActiveRef.current = true;
  };
  const onMoreTouchMove = (e) => {
    if (!moreActiveRef.current) return;
    const dy = e.touches[0].clientY - moreStartYRef.current;
    if (dy > 0) setMoreDragY(dy);
  };
  const onMoreTouchEnd = () => {
    if (moreDragY > 100) setMoreOpen(false);
    setMoreDragY(0);
    moreActiveRef.current = false;
  };

  const onReportsTouchStart = (e) => {
    reportsStartYRef.current = e.touches[0].clientY;
    reportsActiveRef.current = true;
  };
  const onReportsTouchMove = (e) => {
    if (!reportsActiveRef.current) return;
    const dy = e.touches[0].clientY - reportsStartYRef.current;
    if (dy > 0) setReportsDragY(dy);
  };
  const onReportsTouchEnd = () => {
    if (reportsDragY > 100) setReportsOpen(false);
    setReportsDragY(0);
    reportsActiveRef.current = false;
  };

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentTitle = PAGE_TITLES[location.pathname] || 'Admin';
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const closeMore = () => setMoreOpen(false);

  const openReportsPicker = () => {
    setMoreOpen(false);
    setTimeout(() => setReportsOpen(true), 180);
  };

  const isLinkActive = (l) => {
    if (l.special === 'reports') {
      return location.pathname === '/moderation' || location.pathname === '/reports';
    }
    return location.pathname === l.to;
  };

  return (
    <div className="admin-shell">
      <aside className={'admin-sidebar' + (sidebarOpen ? ' open' : '')}>
        <div className="admin-brand-row">
          <div className="brand">LU CONNECT</div>
          <div className="brand-sub">ADMIN</div>
        </div>

        <nav className="admin-nav">
          {SECTIONS.map((section) => {
            const visibleLinks = section.links.filter((l) => !l.superOnly || isSuperAdmin);
            if (visibleLinks.length === 0) return null;
            return (
              <div key={section.title} className="nav-section">
                <div className="nav-section-title">{section.title}</div>
                {visibleLinks.map((l) => {
                  const Icon = l.icon;
                  if (l.special === 'reports') {
                    return (
                      <button
                        key="reports"
                        onClick={() => { setSidebarOpen(false); openReportsPicker(); }}
                        className={'nav-item' + (isLinkActive(l) ? ' active' : '')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          width: '100%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          color: isLinkActive(l) ? 'var(--brand)' : 'inherit',
                          fontSize: 'inherit',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                      >
                        <Icon width={18} height={18} />
                        <span style={{ flex: 1 }}>{l.label}</span>
                      </button>
                    );
                  }
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                      onClick={() => setSidebarOpen(false)}
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
              <div className="admin-user-role">{isSuperAdmin ? 'Super Admin' : 'Admin'}</div>
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

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="btn btn-ghost admin-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Menu"
          >
            {sidebarOpen ? <XIcon width={20} height={20} /> : <MenuIcon width={20} height={20} />}
          </button>

          <div className="admin-topbar-title">{currentTitle}</div>
          <div style={{ flex: 1 }} />

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
                      <div className="admin-user-role">{isSuperAdmin ? 'Super Admin' : 'Admin'}</div>
                    </div>
                  </div>
                  <button className="admin-user-menu-item" onClick={handleSignOut}>
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

      {/* Mobile bottom nav */}
      <nav className="admin-bottom-nav">
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const isMore = item.to === '__more__';
          const isReportsTab = item.to === '/moderation';
          const isActive = isMore
            ? false
            : isReportsTab
              ? (location.pathname === '/moderation' || location.pathname === '/reports')
              : location.pathname === item.to;
          return (
            <button
              key={item.to}
              onClick={() => {
                if (isMore) setMoreOpen(true);
                else if (isReportsTab) openReportsPicker();
                else navigate(item.to);
              }}
              className={'admin-bottom-tab' + (isActive ? ' active' : '')}
            >
              <Icon width={22} height={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* More drawer */}
      {moreOpen && (
        <>
          <div
            onClick={closeMore}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,.6)',
              zIndex: 200,
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              maxHeight: '85vh', background: 'var(--surface)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 210, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', animation: 'drawer-slide-up 250ms ease-out',
              transform: `translateY(${moreDragY}px)`,
              transition: moreDragY === 0 ? 'transform 200ms ease-out' : 'none',
            }}
          >
            <div
              onTouchStart={onMoreTouchStart}
              onTouchMove={onMoreTouchMove}
              onTouchEnd={onMoreTouchEnd}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 0 6px', flexShrink: 0, touchAction: 'none', cursor: 'grab',
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 20px 20px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <MenuIcon width={48} height={48} />
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 12, letterSpacing: 0.3 }}>
                Menu
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, textAlign: 'center' }}>
                All admin sections
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0 24px' }}>
              {SECTIONS.map((section) => {
                const visibleLinks = section.links.filter((l) => !l.superOnly || isSuperAdmin);
                if (visibleLinks.length === 0) return null;
                return (
                  <div key={section.title}>
                    <div style={{
                      padding: '16px 20px 8px',
                      fontSize: 12, fontWeight: 600,
                      color: 'var(--text-3)',
                      textTransform: 'uppercase', letterSpacing: 1,
                    }}>
                      {section.title}
                    </div>
                    {visibleLinks.map((l) => {
                      const Icon = l.icon;
                      const isActive = isLinkActive(l);
                      if (l.special === 'reports') {
                        return (
                          <button
                            key="reports"
                            onClick={openReportsPicker}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 16,
                              width: '100%', padding: '14px 20px',
                              background: 'transparent', border: 'none',
                              color: isActive ? 'var(--brand)' : '#fff',
                              fontSize: 15,
                              fontWeight: isActive ? 600 : 500,
                              textAlign: 'left', cursor: 'pointer',
                            }}
                          >
                            <Icon width={22} height={22} />
                            <span style={{ flex: 1 }}>{l.label}</span>
                          </button>
                        );
                      }
                      return (
                        <button
                          key={l.to}
                          onClick={() => { closeMore(); navigate(l.to); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            width: '100%', padding: '14px 20px',
                            background: 'transparent', border: 'none',
                            color: isActive ? 'var(--brand)' : '#fff',
                            fontSize: 15,
                            fontWeight: isActive ? 600 : 500,
                            textAlign: 'left', cursor: 'pointer',
                          }}
                        >
                          <Icon width={22} height={22} />
                          <span style={{ flex: 1 }}>{l.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              <div style={{ padding: '20px' }}>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    width: '100%', padding: '16px',
                    background: 'var(--brand)', color: '#fff',
                    border: 'none', borderRadius: 16,
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <LogoutIcon width={20} height={20} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reports picker drawer */}
      {reportsOpen && (
        <>
          <div
            onClick={() => setReportsOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,.7)',
              zIndex: 250,
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              background: 'var(--surface)',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              zIndex: 260, display: 'flex', flexDirection: 'column',
              overflow: 'hidden', animation: 'drawer-slide-up 250ms ease-out',
              transform: `translateY(${reportsDragY}px)`,
              transition: reportsDragY === 0 ? 'transform 200ms ease-out' : 'none',
            }}
          >
            <div
              onTouchStart={onReportsTouchStart}
              onTouchMove={onReportsTouchMove}
              onTouchEnd={onReportsTouchEnd}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 0 6px', flexShrink: 0, touchAction: 'none', cursor: 'grab',
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} />
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 20px 24px',
            }}>
              <AlertTriangleIcon width={72} height={72} />
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 14, letterSpacing: 0.2 }}>
                Reports
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
                AI flags and user-submitted reports
              </div>
            </div>

            <div style={{ padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => { setReportsOpen(false); setTimeout(() => navigate('/moderation'), 180); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  width: '100%', padding: '18px 20px',
                  background: 'var(--brand)', color: '#fff',
                  border: 'none', borderRadius: 16,
                  fontSize: 16, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <AlertTriangleIcon width={22} height={22} />
                AI Reports
              </button>
              <button
                onClick={() => { setReportsOpen(false); setTimeout(() => navigate('/reports'), 180); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  width: '100%', padding: '18px 20px',
                  background: 'var(--brand)', color: '#fff',
                  border: 'none', borderRadius: 16,
                  fontSize: 16, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <UsersIcon width={22} height={22} />
                Student Reports
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
