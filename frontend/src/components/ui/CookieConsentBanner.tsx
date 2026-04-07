import { useEffect, useState } from 'react';

const STORAGE_KEY = 'intex.cookie-consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(STORAGE_KEY));
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent notice">
      <div>
        <strong>Cookie settings</strong>
        <p>
          HarborLight Nexus stores a consent preference and, when you sign in, a session token needed to keep the secure portal active.
          Choose whether to allow only essential storage or accept the current site settings.
        </p>
      </div>
      <div className="cookie-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, 'essential-only');
            setVisible(false);
          }}
        >
          Essential only
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, 'accepted');
            setVisible(false);
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
