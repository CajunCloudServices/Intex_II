import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FeedbackBanner } from '../ui/FeedbackBanner';
import { StatusBadge } from '../ui/StatusBadge';

const staffLinks = [
  { to: '/portal/admin', label: 'Admin Dashboard' },
  { to: '/portal/ml-insights', label: 'ML insights' },
  { to: '/portal/donors', label: 'Donors & Contributions' },
  { to: '/portal/caseload', label: 'Caseload Inventory' },
  { to: '/portal/process-recordings', label: 'Process Recordings' },
  { to: '/portal/home-visitations', label: 'Home Visitations' },
  { to: '/portal/reports', label: 'Reports & Analytics' },
];

const donorLinks = [{ to: '/portal/donor-history', label: 'My Contributions' }];
const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/impact', label: 'Impact' },
  { to: '/privacy', label: 'Privacy' },
];

export function AppShell() {
  const { user, logout, authMessage, clearAuthMessage } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Keep the drawer closed when navigation changes and stop the page from scrolling behind it.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  const isDonorOnly = Boolean(user?.roles.length === 1 && user.roles.includes('Donor'));
  const portalLinks = isDonorOnly ? donorLinks : staffLinks;
  const headerLinks = user
    ? [...publicLinks, { to: '/portal', label: 'Portal' }]
    : [...publicLinks, { to: '/login', label: 'Login' }];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="header-stack">
            <div className="brand-mark">HarborLight Nexus</div>
            <div className="brand-subtitle">Nonprofit operations starter platform</div>
          </div>

          <div className="topbar-actions">
            <nav className="topbar-nav topbar-nav-desktop">
              {headerLinks.map((link) => (
                <NavLink key={link.to} to={link.to}>
                  {link.label}
                </NavLink>
              ))}
              {user ? (
                <button className="text-button" onClick={logout} type="button">
                  Sign out
                </button>
              ) : null}
            </nav>

            <button
              className="mobile-menu-button"
              aria-expanded={mobileNavOpen}
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen((open) => !open)}
              type="button"
            >
              Menu
            </button>
          </div>
        </div>

        {mobileNavOpen ? (
          <div className={`topbar-mobile-panel${user ? ' portal-mobile-panel' : ''}`}>
            {user ? (
              <div className="badge-group">
                {user.roles.map((role) => (
                  <StatusBadge key={role} value={role} />
                ))}
              </div>
            ) : null}
            <nav className="topbar-mobile-nav">
              {headerLinks.map((link) => (
                <NavLink key={link.to} to={link.to}>
                  {link.label}
                </NavLink>
              ))}
              {user ? (
                <button className="text-button" onClick={logout} type="button">
                  Sign out
                </button>
              ) : null}
            </nav>
          </div>
        ) : null}
      </header>

      <div className={`shell-body${user ? '' : ' shell-body-public'}`}>
        {user && (
          <>
            <aside className={`sidebar${mobileNavOpen ? ' sidebar-open' : ''}`}>
              <div className="sidebar-heading">Portal</div>
              <div className="sidebar-user">
                <strong>{user.fullName}</strong>
                <div className="badge-group">
                  {user.roles.map((role) => (
                    <StatusBadge key={role} value={role} />
                  ))}
                </div>
              </div>

              <nav className="sidebar-nav">
                {portalLinks.map((link) => (
                  <NavLink key={link.to} to={link.to}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </aside>

            {mobileNavOpen ? (
              <button
                className="sidebar-backdrop"
                aria-label="Close navigation menu"
                onClick={() => setMobileNavOpen(false)}
                type="button"
              />
            ) : null}
          </>
        )}

        <main className="main-content">
          {authMessage ? (
            <FeedbackBanner tone="info" message={authMessage} />
          ) : null}
          {authMessage ? (
            <button className="dismiss-link" onClick={clearAuthMessage} type="button">
              Dismiss
            </button>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
