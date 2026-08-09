import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * better-auth core tables (v1.6 shape) plus the one field we add: `role`.
 *
 * Regenerate rather than hand-edit if better-auth changes: `pnpm auth:schema`.
 * The column names here are what better-auth's Drizzle adapter expects — the
 * v1.7 release candidate renames `accountId`/`providerId` to
 * `providerAccountId`/`issuer`, so do not mix a 1.7 migration with a 1.6
 * runtime or every sign-in fails on a missing column.
 */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    /**
     * Mirrors `lib/roles.ts`. Kept as text rather than a pg enum so adding a
     * role is a code change, not a migration with a table lock.
     */
    role: text("role").default("user").notNull(),
    /** Set by an admin. A suspended user keeps their data but cannot sign in. */
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("user_role_idx").on(t.role)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    /** bcrypt/scrypt hash for credential accounts. Never leaves the Worker. */
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("account_provider_account_uidx").on(t.providerId, t.accountId),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("verification_identifier_idx").on(t.identifier),
    // Expired rows are dead weight; this makes the sweep cheap.
    index("verification_expires_at_idx").on(t.expiresAt),
  ],
);

/**
 * Failed sign-in attempts, for lockout. better-auth does not ship this, and the
 * designs have a dedicated `/login/account-locked` screen, so it is ours.
 * Cloudflare's rate limiter caps requests per IP; this caps them per account,
 * which is the one an attacker rotating IPs actually hits.
 */
export const loginAttempt = pgTable(
  "login_attempt",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    email: text("email").notNull(),
    ipAddress: text("ip_address"),
    succeeded: boolean("succeeded").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("login_attempt_email_time_idx").on(t.email, t.attemptedAt)],
);
