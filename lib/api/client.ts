import { z } from "zod";

import {
  contract,
  pathParams,
  type EndpointKey,
  type InputOf,
  type NoInputKey,
  type OutputOf,
} from "./contract";
import { ApiError, ApiErrorBody } from "./errors";

/**
 * The HTTP transport.
 *
 * Same-origin by default: the site and `/api/*` are served by one Cloudflare
 * Worker deployment, so there is no CORS preflight and the better-auth session
 * cookie rides along without `credentials: "include"` gymnastics.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * Call an endpoint. Both the argument and the result are inferred from
 * `contract.ts`, so a typo in a field name is a compile error.
 *
 * ```ts
 * const threads = await call("chat.threads");            // ChatThread[]
 * const msg = await call("chat.send", { threadId, text, clientToken });
 * ```
 *
 * Throws `ApiError` on every failure — including a dropped connection, which
 * arrives as code `NETWORK`. Callers never see a bare `TypeError`.
 */
export async function call<K extends NoInputKey>(key: K): Promise<OutputOf<K>>;
export async function call<K extends EndpointKey>(
  key: K,
  input: InputOf<K>,
): Promise<OutputOf<K>>;
export async function call<K extends EndpointKey>(
  key: K,
  input?: InputOf<K>,
): Promise<OutputOf<K>> {
  const endpoint = contract[key];
  const { url, body } = buildRequest(key, input);

  let response: Response;
  try {
    response = await fetch(url, {
      method: endpoint.method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body,
    });
  } catch (cause) {
    // Keep the original TypeError as `cause` — "Failed to fetch" vs a DNS
    // failure vs an aborted request all land here, and the distinction is the
    // only thing that makes an offline bug report actionable.
    throw new ApiError(
      { code: "NETWORK", message: `Could not reach ${url}`, fields: null },
      undefined,
      cause,
    );
  }

  if (!response.ok) throw await readError(response);

  // 204 for endpoints whose output is void-ish; anything else must be JSON.
  const payload: unknown = response.status === 204 ? undefined : await response.json();

  const parsed = endpoint.output.safeParse(payload);
  if (!parsed.success) {
    // The server answered 2xx with a shape the contract does not describe.
    // Surface it loudly here rather than letting `undefined` reach a screen.
    throw new ApiError({
      code: "INTERNAL",
      message:
        `Response for "${key}" does not match the contract: ` +
        z.prettifyError(parsed.error),
      fields: null,
    });
  }
  return parsed.data as OutputOf<K>;
}

/**
 * Path params come out of the input object; whatever is left becomes the query
 * string on GET/DELETE, or the JSON body on POST/PATCH.
 */
function buildRequest<K extends EndpointKey>(
  key: K,
  input: unknown,
): { url: string; body?: string } {
  const endpoint = contract[key];
  const source: Record<string, unknown> =
    input && typeof input === "object" ? { ...(input as Record<string, unknown>) } : {};

  let path = endpoint.path;
  for (const param of pathParams(endpoint.path)) {
    const value = source[param];
    if (value === undefined || value === null) {
      throw new ApiError({
        code: "VALIDATION_FAILED",
        message: `"${key}" needs "${param}" to build ${endpoint.path}`,
        fields: { [param]: "required" },
      });
    }
    path = path.replace(`:${param}`, encodeURIComponent(String(value)));
    delete source[param];
  }

  const sendsBody = endpoint.method === "POST" || endpoint.method === "PATCH";
  if (sendsBody) {
    const body = Object.keys(source).length ? JSON.stringify(source) : undefined;
    return { url: `${BASE_URL}${path}`, body };
  }

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(source)) {
    if (v !== undefined && v !== null) query.set(k, String(v));
  }
  const qs = query.toString();
  return { url: `${BASE_URL}${path}${qs ? `?${qs}` : ""}` };
}

/** Turn a non-2xx response into an `ApiError`, however malformed the body is. */
async function readError(response: Response): Promise<ApiError> {
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    raw = undefined;
  }

  const parsed = ApiErrorBody.safeParse(raw);
  if (parsed.success) return new ApiError(parsed.data, response.status);

  return new ApiError(
    {
      code: response.status === 401 ? "UNAUTHENTICATED" : "INTERNAL",
      message: `HTTP ${response.status} from ${response.url}`,
      fields: null,
    },
    response.status,
  );
}
