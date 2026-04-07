import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { clearThemePreference, getConsentLevel, getSavedTheme, persistThemePreference, type ThemeMode } from '../../lib/browserPreferences';
import { FeedbackBanner } from '../ui/FeedbackBanner';
import { StatusBadge } from '../ui/StatusBadge';

const staffLinks = [
  { to: '/portal/admin', label: 'Admin Dashboard', shortLabel: 'AD' },
  { to: '/portal/ml-insights', label: 'ML insights', shortLabel: 'ML' },
  { to: '/portal/donors', label: 'Donors & Contributions', shortLabel: 'DC' },
  { to: '/portal/caseload', label: 'Caseload Inventory', shortLabel: 'CI' },
  { to: '/portal/process-recordings', label: 'Process Recordings', shortLabel: 'PR' },
  { to: '/portal/home-visitations', label: 'Home Visitations', shortLabel: 'HV' },
  { to: '/portal/reports', label: 'Reports & Analytics', shortLabel: 'RA' },
];

const donorLinks = [{ to: '/portal/donor-history', label: 'My Contributions', shortLabel: 'MC' }];
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
  const [theme, setTheme] = useState<ThemeMode>(() => (getConsentLevel() === 'accepted' ? getSavedTheme() : 'default'));

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'calm' ? 'calm' : 'default';
  }, [theme]);

  const isDonorOnly = Boolean(user?.roles.length === 1 && user.roles.includes('Donor'));
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
  const themeLabel = theme === 'calm' ? 'Calm theme' : 'Standard theme';

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'default' ? 'calm' : 'default';
    setTheme(nextTheme);

    if (getConsentLevel() === 'accepted') {
      persistThemePreference(nextTheme);
    } else {
      clearThemePreference();
    }
  };

  return (
    <div className="app-shell">
      <header className={`topbar${user ? ' topbar-portal' : ''}`}>
        <div className="topbar-inner">
          <NavLink className="brand-link" to="/">
            <div className="brand-emblem" aria-hidden="true">
              TP
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
              <button className="ghost-button theme-toggle" onClick={toggleTheme} type="button">
                {themeLabel}
              </button>
            </nav>

            {user ? (
              <div className="topbar-user-card" aria-label="Signed in user">
                <div className="topbar-user-meta">
                  <strong>{user.fullName}</strong>
                  <span>{isDonorOnly ? 'Donor portal access' : 'Internal network'}</span>
                </div>
                <div className="topbar-avatar" aria-hidden="true">
                  {userInitials || 'TP'}
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
              <button className="ghost-button theme-toggle" onClick={toggleTheme} type="button">
                {themeLabel}
              </button>
            </nav>
          </div>
        ) : null}
      </header>

      <div className={`shell-body${user ? '' : ' shell-body-public'}`}>
        {user && (
          <>
            <aside className={`sidebar${mobileNavOpen ? ' sidebar-open' : ''}`}>
              <div className="sidebar-brand">
                <div className="sidebar-brand-title">Staff Portal</div>
                <div className="sidebar-brand-subtitle">{isDonorOnly ? 'Donor network' : 'Internal network'}</div>
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
                <button className="ghost-button theme-toggle" onClick={toggleTheme} type="button">
                  Toggle theme
                </button>
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
