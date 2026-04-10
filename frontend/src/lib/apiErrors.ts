import { ApiError } from '../api/client';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return error.message || 'The app could not reach the server. Check your connection and try again.';
    }

    return error.message || fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export function extractApiFieldErrors(error: unknown): Record<string, string[]> {
  if (!(error instanceof ApiError) || !error.details) {
    return {};
  }

  try {
    const parsed = JSON.parse(error.details) as { errors?: Record<string, string[]> | Array<{ field?: string; message?: string }> };
    if (Array.isArray(parsed.errors)) {
      return parsed.errors.reduce<Record<string, string[]>>((all, entry) => {
        if (!entry?.field || !entry.message) {
          return all;
        }

        const existing = all[entry.field] ?? [];
        all[entry.field] = [...existing, entry.message];
        return all;
      }, {});
    }

    return parsed.errors && typeof parsed.errors === 'object' ? parsed.errors : {};
  } catch {
    return {};
  }
}

export function compactFieldErrors<T extends Record<string, string | undefined>>(errors: T): T {
  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => Boolean(value)),
  ) as T;
}
