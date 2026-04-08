export type ConsentLevel = 'accepted' | 'essential-only';

const CONSENT_COOKIE = 'intex.cookie-consent';

function getCookie(name: string): string | null {
  const prefix = `${name}=`;
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function getConsentLevel(): ConsentLevel | null {
  const value = getCookie(CONSENT_COOKIE);
  return value === 'accepted' || value === 'essential-only' ? value : null;
}

export function saveConsentLevel(value: ConsentLevel) {
  setCookie(CONSENT_COOKIE, value, 60 * 60 * 24 * 365);
}
