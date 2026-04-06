import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SectionCard } from '../../components/ui/Cards';
import { ErrorState } from '../../components/ui/PageState';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@intex.local');
  const [password, setPassword] = useState('Admin!234567');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = (location.state as { from?: string } | undefined)?.from;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const account = await login(email, password);
      const defaultRoute = account.roles.includes('Donor') && account.roles.length === 1 ? '/portal/donor-history' : '/portal/admin';
      navigate(redirectTo ?? defaultRoute, { replace: true });
    } catch {
      setError('Login failed. Use one of the seeded dev accounts from the README.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell narrow">
      <section className="section-card">
        <div className="section-card-header">
          <div>
            <span className="eyebrow">Secure access</span>
            <h1>Sign in</h1>
            <p>JWT-backed API authentication for Admin, Staff, and Donor roles.</p>
          </div>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            <span>Password</span>
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
        </form>
      </section>

      <SectionCard title="Seeded dev accounts" subtitle="Use these cards to fill the form quickly during demos">
        <div className="credential-grid">
          {[
            ['Admin', 'admin@intex.local', 'Admin!234567'],
            ['Staff', 'staff@intex.local', 'Staff!234567'],
            ['Donor', 'donor@intex.local', 'Donor!234567'],
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
      </SectionCard>
    </div>
  );
}
