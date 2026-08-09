import { contract } from "@/lib/api/contract";

import { createAuth } from "./auth";
import { buildContext } from "./context";
import { createDb } from "./db";
import { handlers } from "./handlers";
import { enforceRateLimits, rateLimited } from "./rate-limit";
import {
  dispatch,
  errorResponse,
  jsonResponse,
  matchRoute,
  pathExistsForOtherMethod,
  readInput,
} from "./router";

/**
 * The API Worker.
 *
 * Only `/api/*` reaches this code — `run_worker_first` in wrangler.jsonc routes
 * those here, and everything else (all 85 prerendered pages, /_next/static/*)
 * is served straight from the assets store without invoking the Worker at all.
 * That separation is what keeps page loads off the Free plan's 10ms CPU budget.
 *
 * Order matters: rate limit, then session, then validate, then handle. Each
 * step is cheaper than the one after it, so abuse is rejected before it can
 * cost a database round trip.
 */

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  // The API returns JSON only; nothing here should ever be framed or rendered.
  "x-frame-options": "DENY",
};

/** Auth endpoints get the tight limiter — this is the brute-force gate. */
function isAuthPath(pathname: string): boolean {
  return pathname.startsWith("/api/auth/");
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      // Belt and braces: run_worker_first should mean this never happens, but
      // if it does, hand the request to the assets store rather than 404.
      return env.ASSETS.fetch(request);
    }

    try {
      const response = await handleApi(request, env, ctx, url);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v);
      return response;
    } catch (error) {
      const response = errorResponse(error);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v);
      return response;
    }
  },
} satisfies ExportedHandler<Env>;

async function handleApi(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  url: URL,
): Promise<Response> {
  // Cheap liveness probe. Deliberately before rate limiting and before any
  // binding is touched, so it still answers when the database is down.
  if (url.pathname === "/api/health") {
    return jsonResponse({ ok: true, env: env.APP_ENV });
  }

  const auth = createAuth(env);
  const isAuth = isAuthPath(url.pathname);

  // ── better-auth owns /api/auth/* entirely ────────────────────────────────
  if (isAuth) {
    const decision = await enforceRateLimits(env, request, {
      isAuth: true,
      isWrite: request.method !== "GET",
      userId: null,
    });
    if (!decision.ok) throw rateLimited();
    return auth.handler(request);
  }

  const route = matchRoute(request.method, url.pathname);
  if (!route) {
    // Distinguish "wrong verb" from "no such endpoint" — a 404 on a path that
    // exists under another method sends people hunting for the wrong bug.
    if (pathExistsForOtherMethod(url.pathname)) {
      return jsonResponse(
        { code: "NOT_FOUND", message: `${request.method} not allowed here`, fields: null },
        405,
      );
    }
    return jsonResponse(
      { code: "NOT_FOUND", message: `No endpoint for ${url.pathname}`, fields: null },
      404,
    );
  }

  const db = createDb(env);
  const context = await buildContext({
    auth,
    db,
    env,
    request,
    waitUntil: (p) => ctx.waitUntil(p),
  });

  const endpoint = contract[route.key];
  const isWrite = endpoint.method !== "GET";

  const decision = await enforceRateLimits(env, request, {
    isAuth: false,
    isWrite,
    userId: context.session?.user.id ?? null,
  });
  if (!decision.ok) throw rateLimited();

  const input = await readInput(route.key, request, route.params);
  const output = await dispatch(route.key, handlers, input, context);

  return jsonResponse(output);
}
