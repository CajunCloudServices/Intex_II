import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogoMark } from '../brand/LogoMark';
import { FeedbackBanner } from '../ui/FeedbackBanner';
import { StatusBadge } from '../ui/StatusBadge';

const staffLinks = [
  { to: '/portal/admin', label: 'Admin Dashboard', shortLabel: 'AD' },
  { to: '/portal/donors', label: 'Donors & Contributions', shortLabel: 'DC' },
  { to: '/portal/caseload', label: 'Caseload Inventory', shortLabel: 'CI' },
  { to: '/portal/process-recordings', label: 'Process Recordings', shortLabel: 'PR' },
  { to: '/portal/home-visitations', label: 'Home Visitations', shortLabel: 'HV' },
  { to: '/portal/reports', label: 'Reports & Analytics', shortLabel: 'RA' },
];

const mlDashboardLinks = [
  { to: '/portal/ml-insights/counseling', label: 'Counseling sessions' },
  { to: '/portal/ml-insights/donor', label: 'Donor lapse risk' },
  { to: '/portal/ml-insights/reintegration', label: 'Reintegration outlook' },
  { to: '/portal/ml-insights/social', label: 'Social media analytics' },
  { to: '/portal/ml-insights/social-content-mix', label: 'Social content mix efficiency' },
  { to: '/portal/ml-insights/campaign-timing', label: 'Campaign timing & seasonality' },
  { to: '/portal/ml-insights/safehouse-load', label: 'Safehouse operational load' },
  { to: '/portal/ml-insights/intervention-mix', label: 'Intervention mix effectiveness' },
  { to: '/portal/ml-insights/incident-archetypes', label: 'Incident archetypes' },
  { to: '/portal/ml-insights/resident-trajectory', label: 'Resident trajectory' },
];

const donorLinks = [{ to: '/portal/my-impact', label: 'My Contributions', shortLabel: 'MC' }];
const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/impact', label: 'Impact' },
  { to: '/donate', label: 'Donate' },
  { to: '/privacy', label: 'Privacy' },
];

export function AppShell() {
  const { user, logout, authMessage, clearAuthMessage } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mlNavExpanded, setMlNavExpanded] = useState(() => location.pathname.startsWith('/portal/ml-insights'));

  // Keep the drawer closed when navigation changes and stop the page from scrolling behind it.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/portal/ml-insights')) {
      setMlNavExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = 'default';
  }, []);

  const isDonorOnly = Boolean(user?.roles.length === 1 && user.roles.includes('Donor'));
  const isAdminOnly = Boolean(user?.roles.includes('Admin'));
  const portalTitle = isDonorOnly ? 'Donor Portal' : isAdminOnly ? 'Admin Portal' : 'Staff Portal';
  const portalLinks = isDonorOnly ? donorLinks : staffLinks;
  const userInitials = user?.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const headerLinks = user
    ? [...publicLinks, { to: '/portal', label: 'Portal' }]
    : [...publicLinks, { to: '/login', label: 'Login' }];

  return (
    <div className="app-shell">
      <header className={`topbar${user ? ' topbar-portal' : ''}`}>
        <div className="topbar-inner">
          <NavLink className="brand-link" to="/">
            <div className="brand-emblem" aria-hidden="true">
              <LogoMark variant="header" />
            </div>
            <div className="header-stack">
              <div className="brand-mark">Tanglaw Project</div>
              <div className="brand-subtitle">
                {user
                  ? 'Parol-inspired hope for fieldwork, care, and community records'
                  : 'A parol-inspired symbol of faith, hope, and healing for young survivors'}
              </div>
            </div>
          </NavLink>

          <div className="topbar-actions">
            <nav className="topbar-nav topbar-nav-desktop">
              {headerLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.to === '/'}>
                  {link.label}
                </NavLink>
              ))}
              {user ? (
                <button className="text-button" onClick={logout} type="button">
                  Sign out
                </button>
              ) : null}
            </nav>

            {user ? (
              <div className="topbar-user-card" aria-label="Signed in user">
                <div className="topbar-user-meta">
                  <strong>{user.fullName}</strong>
                  <span>{isDonorOnly ? 'Donor portal access' : 'Internal network'}</span>
                </div>
              </div>
            ) : null}

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
                <NavLink key={link.to} to={link.to} end={link.to === '/'}>
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
              <div className="sidebar-brand">
                <div className="sidebar-brand-title">{portalTitle}</div>
              </div>

              <div className="sidebar-heading">Navigation</div>
              <div className="sidebar-user">
                <strong>{user.fullName}</strong>
                <span>{isDonorOnly ? 'Supporter account' : 'Operations workspace'}</span>
                <div className="badge-group">
                  {user.roles.map((role) => (
                    <StatusBadge key={role} value={role} />
                  ))}
                </div>
              </div>

              <nav className="sidebar-nav">
                {portalLinks.map((link) => (
                  <NavLink key={link.to} to={link.to}>
                    <span className="sidebar-link-mark" aria-hidden="true">
                      {link.shortLabel}
                    </span>
                    <span>{link.label}</span>
                  </NavLink>
                ))}

                {!isDonorOnly ? (
                  <div className="sidebar-subnav-group">
                    <button
                      className={`sidebar-subnav-toggle${location.pathname.startsWith('/portal/ml-insights') ? ' active' : ''}`}
                      type="button"
                      onClick={() => setMlNavExpanded((open) => !open)}
                      aria-expanded={mlNavExpanded}
                    >
                      <span className="sidebar-link-mark" aria-hidden="true">
                        ML
                      </span>
                      <span>ML Insights</span>
                    </button>
                    {mlNavExpanded ? (
                      <div className="sidebar-subnav-links">
                        {mlDashboardLinks.map((mlLink) => (
                          <NavLink key={mlLink.to} to={mlLink.to}>
                            {mlLink.label}
                          </NavLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </nav>

              <div className="sidebar-utility">
                <NavLink className="sidebar-utility-link" to="/impact">
                  Public impact
                </NavLink>
                <button className="sidebar-utility-link text-button" onClick={logout} type="button">
                  Sign out
                </button>
              </div>
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

      <footer className="site-footer" role="contentinfo">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <LogoMark variant="footer" />
            <div className="brand-mark">Tanglaw Project</div>
          </div>
          <div className="site-footer-grid">
            <nav className="site-footer-nav" aria-label="Footer navigation">
              <NavLink to="/privacy">Privacy</NavLink>
              <a href="#terms">Terms</a>
              <a href="#annual-report">Annual Report</a>
              <a href="mailto:hello@tanglawproject.org">Contact</a>
            </nav>
            <div className="site-footer-meta">
              <p className="site-footer-note">© 2026 Tanglaw Project</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
