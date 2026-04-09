const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;

export type ValidationErrors = Record<string, string>;

export function sanitizeText(value: string): string {
  return value.replace(CONTROL_CHAR_REGEX, '').trim().replace(/\s{2,}/g, ' ');
}

export function sanitizeOptionalText(value: string): string | null {
  const cleaned = sanitizeText(value);
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizePhoneInput(value: string): string {
  return value.replace(/[^\d+\-() ]/g, '').trim();
}

export function validateRequired(value: string, label: string): string | null {
  return sanitizeText(value).length > 0 ? null : `${label} is required.`;
}

export function validateEmail(value: string): string | null {
  const cleaned = sanitizeText(value);
  if (!cleaned) {
    return 'Email is required.';
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? null : 'Enter a valid email address, like name@example.org.';
}

export function validatePhone(value: string): string | null {
  const cleaned = normalizePhoneInput(value);
  if (!cleaned) {
    return null;
  }

  return /^\+?[0-9()\- ]{7,20}$/.test(cleaned) ? null : 'Use 7-20 digits and optional +, spaces, (), or dashes.';
}

export function validateCurrency(value: number | null | undefined, label: string): string | null {
  if (value == null || Number.isNaN(value)) {
    return `${label} is required.`;
  }

  return value > 0 ? null : `${label} must be greater than 0.`;
}

export function validateOptionalCurrencyNonNegative(value: number | null | undefined, label: string): string | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return value >= 0 ? null : `${label} cannot be negative.`;
}

export function validateDateNotFuture(value: string, label: string): string | null {
  if (!value) {
    return `${label} is required.`;
  }

  const candidate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(candidate.getTime())) {
    return `${label} must be a valid date.`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return candidate <= today ? null : `${label} cannot be in the future.`;
}

export function validateDateRequired(value: string, label: string): string | null {
  if (!value) {
    return `${label} is required.`;
  }

  const candidate = new Date(`${value}T00:00:00`);
  return Number.isNaN(candidate.getTime()) ? `${label} must be a valid date.` : null;
}

export function withError(errors: ValidationErrors, key: string, message: string | null): ValidationErrors {
  if (!message) {
    return errors;
  }

  return { ...errors, [key]: message };
}
