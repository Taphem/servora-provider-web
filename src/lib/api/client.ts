import { env } from "@/lib/env";

/**
 * The one place a request leaves this app for the real backend. The
 * browser calls the API Gateway only — never servora-provider,
 * servora-services, or any other downstream service directly (see
 * servora-api-gateway's proxy contract, which forwards
 * /api/v1/providers/* and /api/v1/services/* verbatim).
 *
 * Session auth is an httpOnly cookie set by servora-auth and forwarded by
 * the gateway — there is no token for this app to read, store, or attach
 * to headers. `credentials: "include"` is required on every call so the
 * browser sends/accepts that cookie. There is no Authorization header
 * anywhere in this client — never add one, and never store a session
 * value in localStorage/sessionStorage.
 */

/** Frontend-only synthetic codes for failures that never reach the backend's own error envelope — kept clearly distinct from real backend error codes so the two are never confused. */
export const ClientErrorCode = {
  /** fetch() itself threw — offline, DNS failure, CORS rejection, etc. */
  NetworkError: "CLIENT_NETWORK_ERROR",
  /** Response wasn't the `{ error: { code, message } }` envelope every Servora backend shares. */
  MalformedResponse: "CLIENT_MALFORMED_RESPONSE",
} as const;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;

  constructor(code: string, message: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Caller-provided body. Never logged by this client. */
  body?: unknown;
  /** Query string params, appended after `?`. Undefined values are omitted. */
  query?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, options.query);
  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // Deliberately no console.error(error) here — a network-layer failure
    // can echo back parts of the request depending on environment.
    throw new ApiError(
      ClientErrorCode.NetworkError,
      "Couldn't reach the server. Check your connection and try again.",
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      throw new ApiError(payload.error.code, payload.error.message, response.status, payload.error.requestId);
    }
    throw new ApiError(
      ClientErrorCode.MalformedResponse,
      "Something went wrong on our end. Please try again.",
      response.status,
    );
  }

  return payload as T;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = `${env.apiBaseUrl}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const err = (value as { error?: unknown }).error;
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { code?: unknown }).code === "string" &&
    typeof (err as { message?: unknown }).message === "string"
  );
}
