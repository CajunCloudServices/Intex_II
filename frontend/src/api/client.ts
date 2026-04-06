const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5080/api';

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

type RequestOptions = RequestInit & {
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Request failed with ${response.status}`;

    // The API often returns JSON error payloads, but we still want a readable fallback.
    try {
      const parsed = JSON.parse(text) as { message?: string; errors?: string[] };
      message = parsed.message ?? parsed.errors?.join(', ') ?? message;
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
