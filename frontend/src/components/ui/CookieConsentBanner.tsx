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
          This starter currently stores an auth token and UI consent preferences in the browser for local development.
          Replace this with your production consent categories before launch.
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
