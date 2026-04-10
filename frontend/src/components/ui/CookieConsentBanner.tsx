import { useState } from 'react';
import { getConsentLevel, saveConsentLevel } from '../../lib/browserPreferences';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => !getConsentLevel());

  if (!visible) {
    return null;
  }

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent notice">
      <div>
        <strong>Cookie settings</strong>
        <p>
          This notice is functional, not cosmetic. Tanglaw Project always stores the minimum browser data needed to keep the secure portal signed in. If you
          accept non-essential settings, we may store additional browser preference cookies when those features are available.
        </p>
      </div>
      <div className="cookie-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            saveConsentLevel('essential-only');
            setVisible(false);
          }}
        >
          Essential only
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            saveConsentLevel('accepted');
            setVisible(false);
          }}
        >
          Accept optional preference cookie
        </button>
      </div>
    </div>
  );
}
