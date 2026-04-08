function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  // Dev: same-origin `/api` so HttpOnly auth cookies stay first-party (Vite proxies to the API).
  if (import.meta.env.DEV) {
    return '/api';
  }

  throw new Error('Missing VITE_API_URL. Set the frontend API base URL for this deployment.');
}

const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path: string) {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin).toString();
}

export class ApiError extends Error {
  status: number;
  details: string;

  constructor(status: number, message: string, details = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = RequestInit;

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  const body = options.body;
  const shouldSetJsonContentType =
    !headers.has('Content-Type') &&
    typeof body === 'string' &&
    body.length > 0 &&
    !(options.method && options.method.toUpperCase() === 'GET');

  if (shouldSetJsonContentType) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Request failed with ${response.status}`;

    try {
      const parsed = JSON.parse(text) as {
        message?: string;
        errors?: Array<string | { field?: string; message?: string }>;
      };
      const formattedErrors = parsed.errors
        ?.map((entry) => {
          if (typeof entry === 'string') {
            return entry;
          }
          if (!entry) {
            return '';
          }
          return entry.field ? `${entry.field}: ${entry.message ?? 'Invalid value.'}` : (entry.message ?? 'Invalid value.');
        })
        .filter(Boolean)
        .join(', ');
      message = parsed.message ?? formattedErrors ?? message;
    } catch {
      if (text) {
        message = text;
      }
    }

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('intex:unauthorized'));
    }

    if (response.status === 403) {
      window.dispatchEvent(new CustomEvent('intex:forbidden'));
    }

    throw new ApiError(response.status, message, text);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
