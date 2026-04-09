import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { LogoMark } from '../../components/brand/LogoMark';
import { SectionCard } from '../../components/ui/Cards';
import { ErrorState } from '../../components/ui/PageState';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const redirectTo = (location.state as { from?: string } | undefined)?.from;

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providers = await api.authProviders();
        setGoogleEnabled(providers.googleEnabled);
      } catch {
        setGoogleEnabled(false);
      }
    };

    void loadProviders();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const account = await login(email, password);
      const defaultRoute = account.roles.includes('Donor') && account.roles.length === 1 ? '/portal/my-impact' : '/portal/admin';
      navigate(redirectTo ?? defaultRoute, { replace: true });
    } catch (err: any) {
      if (err.message && err.message.includes('2FA_REQUIRED')) {
        setRequiresMfa(true);
      } else {
        setError('Login failed. Check your email and password, then try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await api.loginMfa(mfaCode);
      const account = response.user;
      // Also update AuthContext manually or refresh the session
      await window.location.assign(redirectTo ?? (account.roles.includes('Donor') && account.roles.length === 1 ? '/portal/my-impact' : '/portal/admin'));
    } catch {
      setError('Invalid or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell narrow">
      <div className="login-brand-mark">
        <LogoMark variant="login" />
      </div>
      <section className="section-card">
        <div className="section-card-header">
          <div>
            <span className="eyebrow">Secure access</span>
            <h1>Sign in</h1>
            <p>Authorized staff and donors can sign in here to review operations, care records, and giving history.</p>
          </div>
        </div>

        {requiresMfa ? (
          <form className="stack-form" onSubmit={handleMfaSubmit}>
            <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Open your Authenticator app (e.g., Google Authenticator, Authy, or Apple Passwords) and locate the 6-digit code for your Tanglaw Project account. Codes refresh every 30 seconds.
            </div>
            <label className="field-shell">
              <span className="field-label">Verification Code</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                autoFocus
              />
            </label>
            {error ? <ErrorState message={error} /> : null}
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? 'Verifying...' : 'Verify Code'}
            </button>
            <button className="ghost-button" type="button" onClick={() => { setRequiresMfa(false); setError(null); }}>
              Cancel
            </button>
          </form>
        ) : (
          <form className="stack-form" onSubmit={handleSubmit}>
            <label className="field-shell">
              <span className="field-label">Email</span>
              <input
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="field-shell">
              <span className="field-label">Password</span>
              <div className="password-field">
                <input
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button className="ghost-button" onClick={() => setShowPassword((value) => !value)} type="button">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {error ? <ErrorState message={error} /> : null}

            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>

            {googleEnabled ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  window.location.href = api.googleLoginUrl(redirectTo ?? '/portal');
                }}
              >
                Continue with Google
              </button>
            ) : null}
          </form>
        )}
      </section>

      <SectionCard
        title="Review access accounts"
        subtitle="Open only when you need the prepared evaluation accounts."
        actions={
          <button className="ghost-button" onClick={() => setShowDemoAccess((value) => !value)} type="button">
            {showDemoAccess ? 'Hide accounts' : 'Show accounts'}
          </button>
        }
      >
        {showDemoAccess ? (
          <div className="credential-grid">
            {[
              ['Admin', 'admin@intex.local', 'Admin!23456789'],
              ['Staff', 'staff@intex.local', 'Staff!23456789'],
              ['Donor', 'donor@intex.local', 'Donor!23456789'],
            ].map(([label, valueEmail, valuePassword]) => (
              <button
                key={label}
                className="credential-card"
                onClick={() => {
                  setEmail(valueEmail);
                  setPassword(valuePassword);
                  setError(null);
                }}
                type="button"
              >
                <strong>{label}</strong>
                <span>{valueEmail}</span>
                <span>{valuePassword}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="home-muted">Prepared reviewer accounts are available when needed, but they stay hidden during normal use.</p>
        )}
      </SectionCard>
    </div>
  );
}
