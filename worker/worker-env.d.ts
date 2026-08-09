/**
 * Bindings and secrets available to the Worker. Mirrors `wrangler.jsonc` —
 * adding a binding there means adding it here, or the handler that uses it
 * won't typecheck.
 */
declare global {
  interface Env {
    /** Static assets. Present so the Worker can fall through to the site. */
    ASSETS: Fetcher;

    // ── Rate limiters (see wrangler.jsonc `ratelimits`) ────────────────────
    RL_API: RateLimiter;
    RL_AUTH: RateLimiter;
    RL_WRITE: RateLimiter;

    // ── Vars ───────────────────────────────────────────────────────────────
    APP_ENV: "production" | "qa" | "development";

    // ── Secrets (`wrangler secret put …`) ──────────────────────────────────
    /** Neon Postgres connection string. */
    DATABASE_URL: string;
    /** Session signing key. */
    BETTER_AUTH_SECRET: string;
    /** Public origin, e.g. https://advisory-platform.nsza.workers.dev */
    BETTER_AUTH_URL: string;
  }

  /**
   * Cloudflare's rate-limiting binding. Not yet in @cloudflare/workers-types,
   * so it is declared here.
   */
  interface RateLimiter {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  }
}

export {};
