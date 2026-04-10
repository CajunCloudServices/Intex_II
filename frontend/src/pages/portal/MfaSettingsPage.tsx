import { useEffect, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../api';
import type { MfaSetupResponse } from '../../api/types';
import { StaffPortalPageHeader } from '../../components/portal/StaffPortalPageHeader';
import { SectionCard } from '../../components/ui/Cards';
import { ErrorState } from '../../components/ui/PageState';
import { FeedbackBanner } from '../../components/ui/FeedbackBanner';

export function MfaSettingsPage() {
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.setupMfa()
      .then(setSetup)
      .catch(() => setError('Failed to load MFA setup.'))
      .finally(() => setLoading(false));
  }, []);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await api.verifyMfa(code);
      setMessage('Multi-factor Authentication has been successfully enabled.');
      setCode('');
    } catch {
      setError('Invalid verification code. Please try again.');
    }
  };

  const handleDisable = async () => {
    if (!window.confirm('Are you sure you want to disable MFA? Your account will be less secure.')) return;
    
    setMessage(null);
    setError(null);
    try {
      await api.disableMfa();
      setMessage('Multi-factor Authentication has been disabled.');
      // Refresh the setup payload in case they want to re-enable
      const newSetup = await api.setupMfa();
      setSetup(newSetup);
    } catch {
      setError('Failed to disable MFA.');
    }
  };

  return (
    <div className="page-shell">
      <StaffPortalPageHeader 
        eyebrow="Security & Access"
        title="Security Settings" 
        description="Manage your Two-Factor Authentication (2FA) preferences here."
      />

      {message && <FeedbackBanner tone="success" message={message} />}
      {error && <ErrorState message={error} />}

      <SectionCard title="Two-Factor Authentication (2FA)">
        {loading ? (
          <p>Loading security profile...</p>
        ) : setup ? (
          <div className="mfa-setup-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <p>Scan this QR code using your preferred Authenticator App (e.g., Google Authenticator, Authy).</p>
              
              <div style={{ background: 'white', padding: '1rem', display: 'inline-block', borderRadius: '8px', border: '1px solid var(--border)', margin: '1rem 0' }}>
                <QRCodeSVG value={setup.authenticatorUri} size={200} />
              </div>
              
              <div style={{ marginTop: '0.5rem' }}>
                <small className="eyebrow" style={{ userSelect: 'all', background: 'var(--surface-sunken)', padding: '0.5rem', borderRadius: '4px', letterSpacing: '1px' }}>
                  {setup.sharedKey}
                </small>
              </div>
              <p className="home-muted" style={{ marginTop: '0.5rem' }}>If you cannot scan the QR code, use the setup key above.</p>
            </div>

            <hr />

            <form className="stack-form" onSubmit={handleVerify} style={{ maxWidth: '400px' }}>
              <p>Enter the 6-digit code from your app to verify and enable 2FA:</p>
              <label className="field-shell">
                <span className="field-label">Verification Code</span>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  minLength={6}
                  maxLength={8}
                  pattern="[0-9\s-]*"
                  inputMode="numeric"
                  required
                />
              </label>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="primary-button">Enable MFA</button>
                <button type="button" className="ghost-button" onClick={handleDisable} style={{ color: 'var(--critical)' }}>Disable MFA</button>
              </div>
            </form>
          </div>
        ) : (
          <p>Unable to retrieve MFA configuration.</p>
        )}
      </SectionCard>
    </div>
  );
}
