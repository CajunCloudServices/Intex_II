export type ConsentLevel = 'accepted' | 'essential-only';
export type ThemePreference = 'light' | 'dark';

const CONSENT_COOKIE = 'intex.cookie-consent';
const THEME_COOKIE = 'intex.theme';

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

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function getConsentLevel(): ConsentLevel | null {
  const value = getCookie(CONSENT_COOKIE);
  return value === 'accepted' || value === 'essential-only' ? value : null;
}

export function saveConsentLevel(value: ConsentLevel) {
  setCookie(CONSENT_COOKIE, value, 60 * 60 * 24 * 365);
  if (value !== 'accepted') {
    deleteCookie(THEME_COOKIE);
  }
}

export function getThemePreference(): ThemePreference | null {
  const value = getCookie(THEME_COOKIE);
  return value === 'light' || value === 'dark' ? value : null;
}

export function saveThemePreference(value: ThemePreference) {
  if (getConsentLevel() === 'accepted') {
    setCookie(THEME_COOKIE, value, 60 * 60 * 24 * 365);
  } else {
    deleteCookie(THEME_COOKIE);
  }
}
