export function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Calendar dates from the API (YYYY-MM-DD / DateOnly) must not use UTC midnight parsing or US timezones show the wrong day. */
export function formatDate(value: string) {
  if (!value?.trim()) {
    return '';
  }
  const dateOnly = value.length >= 10 ? value.slice(0, 10) : value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(y, mo - 1, d));
    }
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function dateStringToTime(value: string) {
  const dateOnly = value.length >= 10 ? value.slice(0, 10) : value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)) {
      return new Date(y, mo - 1, d).getTime();
    }
  }

  return new Date(value).getTime();
}

/** UI tables sort API ISO date strings newest-first in several places; keep date-only parsing consistent. */
export function compareDateStringsDesc(left: string, right: string) {
  return dateStringToTime(right) - dateStringToTime(left);
}

export function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim().toLowerCase();
}
