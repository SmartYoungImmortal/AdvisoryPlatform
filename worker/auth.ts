import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { createDb, schema } from "./db";

/**
 * better-auth, built per request from `env`.
 *
 * Three things here are deliberate, and the unmerged `better-auth` branch got
 * all three wrong — which is why nothing on it worked:
 *
 * 1. `emailAndPassword` must be **enabled**. It defaults to off, so a config
 *    that only sets `database` exposes no way to sign in at all.
 * 2. `secret` and `baseURL` come from `env`, not `process.env`.
 * 3. It is constructed per request. Module scope has no bindings in Workers.
 */
export function createAuth(env: Env) {
  const db = createDb(env);

  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),

    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    // Same-origin only. The API and the site are one deployment, so there is
    // no third party that legitimately needs to post here.
    trustedOrigins: [env.BETTER_AUTH_URL],

    emailAndPassword: {
      enabled: true,
      // 8 is the floor the register screen validates against; keep them equal
      // or the client shows "ok" and the server rejects.
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Left off for now: there is no transactional mail provider yet, and
      // requiring verification without one locks every new user out.
      requireEmailVerification: false,
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },

    user: {
      additionalFields: {
        /**
         * Mirrors `lib/roles.ts`. `input: false` is the important part — it
         * stops a client from sending `role: "admin"` in the sign-up body and
         * promoting itself. Role changes go through the admin endpoints only.
         */
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          input: false,
        },
      },
    },

    advanced: {
      // The site is served over HTTPS on workers.dev; there is no
      // cross-site context, so Lax is both sufficient and the safest default.
      defaultCookieAttributes: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
