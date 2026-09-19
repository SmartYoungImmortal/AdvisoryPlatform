/**
 * The one way this app talks to the Nest API.
 *
 * Every call goes through here for three reasons the API's own shape forces.
 *
 * The API wraps every success in `{ statusCode, message, data }` — see its
 * `TransformInterceptor` — and every failure in `{ statusCode, message }` with no
 * `data` key at all. A call site that used bare `fetch` would have to remember to
 * reach into `.data` and would get `undefined` on the error path instead of an
 * error. So the envelope is unwrapped in exactly one place.
 *
 * Authentication is a cookie, set by better-auth at `/api/auth/*`. A cookie only
 * travels if the request asks for it, so `credentials: "include"` is not optional
 * and must not be left to a call site to remember.
 *
 * And the app is a static export (`output: "export"`), so there is no server to
 * proxy through and no request-time environment. `NEXT_PUBLIC_API_URL` is inlined
 * at build time: pointing a deployment at a different API means rebuilding it, not
 * editing a variable.
 */

/** A page of results, exactly as the API's `PaginatedResult<T>` is shaped. */
export interface Paginated<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

/**
 * A request that reached the API and came back as a failure.
 *
 * `status` is the HTTP status and `message` is the API's own sentence, already
 * flattened — its exception filter joins a validation array into one string, so
 * this is safe to show a user once it has been translated.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  /** The session is missing or expired, and signing in again is the fix. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /** Signed in, but not allowed to do this. Signing in again changes nothing. */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/** A request that never reached the API: offline, DNS, CORS, a refused connection. */
export class ApiUnreachableError extends Error {
  constructor(cause: unknown) {
    super("The API could not be reached");
    this.name = "ApiUnreachableError";
    this.cause = cause;
  }
}

/**
 * Where the API is.
 *
 * Read once, at module scope, because under a static export this is a literal
 * substituted at build time rather than a lookup. Left unset, every call fails
 * with a stated reason instead of silently resolving against the site's own
 * origin, which would 404 into the HTML of the exported page.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";

/** Whether the app has been built with an API to talk to at all. */
export const isApiConfigured = BASE_URL.length > 0;

type Query = Readonly<Record<string, string | number | boolean | undefined>>;

export interface RequestOptions {
  /** Appended as a query string; `undefined` values are dropped, not sent empty. */
  readonly query?: Query;
  /** Serialised as JSON. Use `FormData` for uploads — see `body` handling below. */
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  /** Prefixed with `/api/v1` unless this is set — better-auth lives outside it. */
  readonly unprefixed?: boolean;
}

function buildUrl(path: string, query?: Query, unprefixed = false): string {
  const prefix = unprefixed ? "" : "/api/v1";
  const url = new URL(`${BASE_URL}${prefix}/${path.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * The body, unwrapped if it is enveloped, or a typed error.
 *
 * **Only `/api/v1` responses carry the envelope.** better-auth is mounted as
 * Express middleware, so its `/api/auth/*` replies never reach the API's
 * `TransformInterceptor` — they are the raw better-auth body. Unwrapping those
 * returned `undefined` for every successful sign-in, and `get-session` signed out
 * answers a literal `null` body, where reading `.data` throws a TypeError. So
 * `enveloped` follows the prefix: a call made with `unprefixed: true` gets its
 * body back as it stands.
 *
 * The error path is shared, and correctly so: the API's filter emits
 * `{statusCode, message}` and better-auth emits `{message, code}`, so `message`
 * is where the sentence is either way.
 *
 * A failure is read from the body when the body is JSON, and falls back to the
 * status text when it is not — a 502 from something in front of the API returns
 * HTML, and `response.json()` would throw over the top of the real problem.
 */
async function unwrap<T>(response: Response, enveloped: boolean): Promise<T> {
  // 204 carries no body. `response.json()` on an empty body throws, and a void
  // DELETE is a perfectly ordinary success.
  if (response.status === 204) return null as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    if (response.ok) throw new ApiUnreachableError(cause);
    throw new ApiError(response.status, response.statusText || "Request failed");
  }

  if (!response.ok) {
    // `payload` may be `null` here, so the read is guarded rather than cast.
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : response.statusText || "Request failed";
    throw new ApiError(response.status, message);
  }

  if (!enveloped) return payload as T;

  // `data` is always present on an enveloped success, and is `null` rather than
  // absent for a void handler, which the interceptor guarantees on purpose.
  return (payload as { data: unknown }).data as T;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!isApiConfigured) {
    throw new ApiUnreachableError(
      "NEXT_PUBLIC_API_URL was not set when this build was made",
    );
  }

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query, options.unprefixed), {
      method,
      // The session cookie. Without this the API sees every request as anonymous.
      credentials: "include",
      // FormData sets its own multipart boundary; naming a content type here would
      // replace the boundary with nothing and the upload would arrive unparseable.
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined && !isFormData
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    // fetch rejects for network, DNS, CORS and aborts — never for a 4xx or 5xx.
    // An abort is the caller's own doing, so it is passed through untouched.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiUnreachableError(cause);
  }

  // Enveloped exactly when the call went through `/api/v1`; see `unwrap`.
  return unwrap<T>(response, options.unprefixed !== true);
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("GET", path, options),
  post: <T>(path: string, options?: RequestOptions) =>
    request<T>("POST", path, options),
  patch: <T>(path: string, options?: RequestOptions) =>
    request<T>("PATCH", path, options),
  put: <T>(path: string, options?: RequestOptions) =>
    request<T>("PUT", path, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
};
