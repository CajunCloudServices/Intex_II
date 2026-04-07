import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { clearThemePreference, getConsentLevel, getSavedTheme, persistThemePreference, type ThemeMode } from '../../lib/browserPreferences';
import { FeedbackBanner } from '../ui/FeedbackBanner';
import { StatusBadge } from '../ui/StatusBadge';

const staffLinks = [
  { to: '/portal/admin', label: 'Admin Dashboard' },
  { to: '/portal/donors', label: 'Donors & Contributions' },
  { to: '/portal/caseload', label: 'Caseload Inventory' },
  { to: '/portal/process-recordings', label: 'Process Recordings' },
  { to: '/portal/home-visitations', label: 'Home Visitations' },
  { to: '/portal/reports', label: 'Reports & Analytics' },
];

const donorLinks = [{ to: '/portal/my-impact', label: 'My Impact Dashboard' }];
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
  const portalLinks = isDonorOnly
    ? donorLinks
    : user?.roles.includes('Admin')
      ? [...staffLinks, { to: '/portal/audit-history', label: 'Audit History' }]
      : staffLinks;
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
      {/* The shell stays mounted across the public site and portal so navigation, feedback,
          and layout behavior stay consistent while only the routed page content changes. */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="header-stack">
            <div className="brand-mark">Tanglaw Project</div>
            <div className="brand-subtitle">Safe housing &amp; healing for young survivors</div>
          </div>

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
              <div className="sidebar-heading">Portal</div>
              <div className="sidebar-user">
                <strong>{user.fullName}</strong>
                <span>{themeLabel}</span>
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

      <footer className="site-footer" role="contentinfo">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <div className="brand-mark">Tanglaw Project</div>
            <p className="site-footer-tagline">A refuge-inspired nonprofit program for survivors.</p>
          </div>
          <div className="site-footer-grid">
            <nav className="site-footer-nav" aria-label="Footer navigation">
              <NavLink to="/" end>
                Home
              </NavLink>
              <NavLink to="/impact">Impact</NavLink>
              <NavLink to="/donate">Donate</NavLink>
              <NavLink to="/privacy">Privacy</NavLink>
              <NavLink to="/login">Login</NavLink>
            </nav>
            <div className="site-footer-meta">
              <p>
                <span className="site-footer-label">Contact:</span>{' '}
                <a href="mailto:hello@tanglawproject.example.org">hello@tanglawproject.example.org</a>
              </p>
              <p className="site-footer-note">For partnership inquiries, safeguarding questions, or donor support.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
