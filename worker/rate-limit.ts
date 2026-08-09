import { ApiError } from "@/lib/api/errors";

/**
 * Rate limiting.
 *
 * Runs before any handler work, so a flood costs one binding call and never
 * reaches the database. Three tiers, because one number cannot serve both a
 * chat inbox poll and a password attempt:
 *
 * | limiter    | budget    | guards                                      |
 * |------------|-----------|---------------------------------------------|
 * | `RL_AUTH`  | 10 / min  | sign-in, sign-up, password reset — brute force |
 * | `RL_WRITE` | 30 / min  | every mutation — database flooding          |
 * | `RL_API`   | 120 / min | everything — general abuse                  |
 *
 * Keys are per-IP and, once a session exists, per-user. Per-IP alone is weak
 * (mobile carriers NAT thousands of users behind one address, and an attacker
 * can rotate); per-user alone does nothing before sign-in. Both is the point.
 */

/**
 * The caller's address. `CF-Connecting-IP` is set by Cloudflare's edge and
 * cannot be spoofed by the client — unlike `X-Forwarded-For`, which is just a
 * request header anyone can write.
 */
export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

export interface RateLimitDecision {
  readonly ok: boolean;
  /** Which limiter rejected, for the log line. */
  readonly limiter?: string;
}

async function check(
  limiter: RateLimiter | undefined,
  name: string,
  key: string,
): Promise<RateLimitDecision> {
  // In `wrangler dev` without the binding configured, fail open rather than
  // making local development impossible. Production always has the binding.
  if (!limiter) return { ok: true };

  const { success } = await limiter.limit({ key: `${name}:${key}` });
  return success ? { ok: true } : { ok: false, limiter: name };
}

/**
 * Apply the tiers that fit this request. `userId` is null before sign-in.
 */
export async function enforceRateLimits(
  env: Env,
  request: Request,
  opts: { readonly isAuth: boolean; readonly isWrite: boolean; readonly userId: string | null },
): Promise<RateLimitDecision> {
  const ip = clientIp(request);
  // Prefer the user id once known: it survives IP rotation.
  const subject = opts.userId ?? ip;

  const general = await check(env.RL_API, "api", subject);
  if (!general.ok) return general;

  if (opts.isAuth) {
    // Auth is keyed on IP specifically — there is no trustworthy user id yet,
    // and the whole point is to stop guessing at *other people's* accounts.
    const auth = await check(env.RL_AUTH, "auth", ip);
    if (!auth.ok) return auth;
  }

  if (opts.isWrite) {
    const write = await check(env.RL_WRITE, "write", subject);
    if (!write.ok) return write;
  }

  return { ok: true };
}

export function rateLimited(): ApiError {
  return new ApiError(
    {
      code: "RATE_LIMITED",
      message: "Too many requests. Slow down and try again shortly.",
      fields: null,
    },
    429,
  );
}
