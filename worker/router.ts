import { z } from "zod";

import {
  contract,
  pathParams,
  type EndpointKey,
  type HandlerContext,
  type Handlers,
} from "@/lib/api/contract";
import { ApiError, ApiErrorBody, STATUS_BY_CODE } from "@/lib/api/errors";

/**
 * Dispatch for `/api/*`, driven entirely by `lib/api/contract.ts`.
 *
 * There is no route table to keep in sync — adding an endpoint to the contract
 * is what makes it routable, and `Handlers` makes it a compile error until it
 * is implemented. A route that exists here but not in the contract is
 * unreachable by construction, which is the property that keeps the client and
 * the server from drifting.
 */

interface Route {
  readonly key: EndpointKey;
  readonly method: string;
  readonly pattern: RegExp;
  readonly params: readonly string[];
}

/**
 * Built once per isolate. Longest literal prefix first so `/api/session` can
 * never be swallowed by a `/api/:something` pattern.
 */
const routes: Route[] = Object.entries(contract)
  .map(([key, endpoint]) => {
    const params = pathParams(endpoint.path);
    const source = endpoint.path
      // Escape regex metacharacters in the literal parts before substituting.
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "([^/]+)");
    return {
      key: key as EndpointKey,
      method: endpoint.method,
      pattern: new RegExp(`^${source}$`),
      params,
    };
  })
  .sort((a, b) => b.pattern.source.length - a.pattern.source.length);

export interface MatchedRoute {
  readonly key: EndpointKey;
  readonly params: Record<string, string>;
}

/** Find the endpoint for a request, or null. */
export function matchRoute(method: string, pathname: string): MatchedRoute | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(pathname);
    if (!match) continue;

    const params: Record<string, string> = {};
    route.params.forEach((name, i) => {
      params[name] = decodeURIComponent(match[i + 1]);
    });
    return { key: route.key, params };
  }
  return null;
}

/** True when any endpoint claims this path under a different method. */
export function pathExistsForOtherMethod(pathname: string): boolean {
  return routes.some((route) => route.pattern.test(pathname));
}

/**
 * Assemble the handler input: path params, then query or body.
 *
 * Everything is validated against the contract's input schema before a handler
 * sees it — the Worker never trusts the client, even though the client sends
 * the same shapes, because "the client" is whatever posts to a public URL.
 */
export async function readInput(
  key: EndpointKey,
  request: Request,
  params: Record<string, string>,
): Promise<unknown> {
  const endpoint = contract[key];
  const raw: Record<string, unknown> = { ...params };

  if (endpoint.method === "POST" || endpoint.method === "PATCH") {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/json")) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        throw new ApiError({
          code: "VALIDATION_FAILED",
          message: "Body is not valid JSON",
          fields: null,
        });
      }
      if (body && typeof body === "object" && !Array.isArray(body)) {
        Object.assign(raw, body);
      }
    }
  } else {
    for (const [k, v] of new URL(request.url).searchParams) raw[k] = v;
  }

  // A void input means the endpoint takes nothing; hand the schema `undefined`
  // rather than an empty object, which `z.void()` would reject.
  if (endpoint.input instanceof z.ZodVoid) return undefined;

  const parsed = endpoint.input.safeParse(coerceScalars(endpoint.input, raw));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (path) fields[path] ??= issue.message;
    }
    throw new ApiError({
      code: "VALIDATION_FAILED",
      message: "Input does not match the contract",
      fields: Object.keys(fields).length ? fields : null,
    });
  }
  return parsed.data;
}

/**
 * Query strings and path params are always strings; the schemas expect real
 * numbers and booleans. Coerce only where the schema actually asks for one, so
 * a string field that happens to hold "123" stays a string.
 */
function coerceScalars(schema: z.ZodType, raw: Record<string, unknown>): unknown {
  if (!(schema instanceof z.ZodObject)) return raw;

  const shape = (schema as z.ZodObject).shape;
  const out: Record<string, unknown> = { ...raw };

  for (const [key, field] of Object.entries(shape)) {
    const value = out[key];
    if (typeof value !== "string") continue;

    const kind = unwrap(field as z.ZodType);
    if (kind instanceof z.ZodNumber) {
      const n = Number(value);
      if (!Number.isNaN(n)) out[key] = n;
    } else if (kind instanceof z.ZodBoolean) {
      if (value === "true") out[key] = true;
      else if (value === "false") out[key] = false;
    }
  }
  return out;
}

/** Peel optional/nullable/default wrappers to find the underlying type. */
function unwrap(schema: z.ZodType): z.ZodType {
  let current: z.ZodType = schema;
  for (let i = 0; i < 10; i += 1) {
    if (
      current instanceof z.ZodOptional ||
      current instanceof z.ZodNullable ||
      current instanceof z.ZodDefault
    ) {
      current = (current as unknown as { unwrap(): z.ZodType }).unwrap();
    } else {
      return current;
    }
  }
  return current;
}

/** Enforce the endpoint's declared `auth` level. Throws, never returns false. */
export function enforceAuth(key: EndpointKey, ctx: HandlerContext): void {
  const level = contract[key].auth;
  if (level === "user") ctx.requireUser();
  else if (level === "advisor") ctx.requireAdvisor();
}

export async function dispatch<Ctx extends HandlerContext>(
  key: EndpointKey,
  handlers: Handlers<Ctx>,
  input: unknown,
  ctx: Ctx,
): Promise<unknown> {
  enforceAuth(key, ctx);
  const handler = handlers[key] as (i: unknown, c: Ctx) => Promise<unknown>;
  return handler(input, ctx);
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status: body === undefined ? 204 : status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // The API is never a document; stop any intermediary caching a
      // per-user response.
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      code: error.code,
      message: error.message,
      fields: error.fields ?? null,
    };
    return jsonResponse(body, error.status || STATUS_BY_CODE[error.code]);
  }

  // Anything unrecognised is a bug. Log the detail, tell the client nothing —
  // stack traces and driver messages are an information leak.
  console.error("unhandled error in /api", error);
  return jsonResponse(
    { code: "INTERNAL", message: "Internal error", fields: null } satisfies ApiErrorBody,
    500,
  );
}
