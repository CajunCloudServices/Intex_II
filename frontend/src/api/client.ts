function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  // Dev: same-origin `/api` so HttpOnly auth cookies stay first-party (Vite proxies to the API).
  if (import.meta.env.DEV) {
    return "/api";
  }

  throw new Error(
    "Missing VITE_API_URL. Set the frontend API base URL for this deployment.",
  );
}

const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path: string) {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin).toString();
}

export class ApiError extends Error {
  status: number;
  details: string;

  constructor(status: number, message: string, details = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = RequestInit;

function buildGenericHttpErrorMessage(status: number, statusText: string) {
  if (status === 429) {
    return "Too many requests were sent. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "The service is temporarily unavailable. Please try again in a moment.";
  }

  if (status === 404) {
    return "The requested data could not be found.";
  }

  return statusText
    ? `Request failed: ${statusText}`
    : `Request failed with ${status}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  const body = options.body;
  const shouldSetJsonContentType =
    !headers.has("Content-Type") &&
    typeof body === "string" &&
    body.length > 0 &&
    !(options.method && options.method.toUpperCase() === "GET");

  if (shouldSetJsonContentType) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      ...options,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error
      ? `The app could not reach the server. ${error.message}`
      : "The app could not reach the server. Check your connection and try again.";
    throw new ApiError(0, message);
  }

  if (!response.ok) {
    const text = await response.text();
    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? "";
    const looksLikeHtml =
      contentType.includes("text/html") || /^\s*</.test(text);
    let message = buildGenericHttpErrorMessage(
      response.status,
      response.statusText,
    );

    if (!looksLikeHtml && text) {
      try {
        const parsed = JSON.parse(text) as {
          message?: string;
          title?: string;
          detail?: string;
          errors?: Array<string | { field?: string; message?: string }> | Record<string, string[]>;
        };

        let formattedErrors: string | undefined;
        if (Array.isArray(parsed.errors)) {
          // Custom array format
          formattedErrors = parsed.errors
            .map((entry) => {
              if (typeof entry === "string") return entry;
              if (!entry) return "";
              return entry.field
                ? `${entry.field}: ${entry.message ?? "Invalid value."}`
                : (entry.message ?? "Invalid value.");
            })
            .filter(Boolean)
            .join("; ");
        } else if (parsed.errors && typeof parsed.errors === "object") {
          // ASP.NET Core model validation format: { "FieldName": ["message"] }
          formattedErrors = Object.entries(parsed.errors as Record<string, string[]>)
            .flatMap(([field, messages]) =>
              messages.map((msg) => `${field}: ${msg}`)
            )
            .join("; ");
        }

        message =
          parsed.message ??
          formattedErrors ??
          parsed.detail ??
          parsed.title ??
          message;
      } catch {
        if (text && !contentType.includes("text/plain")) {
          message = buildGenericHttpErrorMessage(
            response.status,
            response.statusText,
          );
        } else if (text) {
          message = text;
        }
      }
    }

    if (response.status === 401 && path !== '/auth/me') {
      window.dispatchEvent(new CustomEvent('intex:unauthorized'));
    }

    if (response.status === 403) {
      window.dispatchEvent(new CustomEvent("intex:forbidden"));
    }

    throw new ApiError(response.status, message, text);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
