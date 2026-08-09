import { eq } from "drizzle-orm";

import type { HandlerContext } from "@/lib/api/contract";
import { apiError } from "@/lib/api/errors";
import type { Session, User } from "@/lib/api/schema";

import type { Auth } from "./auth";
import type { Db } from "./db";
import { schema } from "./db";

/**
 * What every handler receives. Extends the shared `HandlerContext` from the
 * contract with the server-only bits — the database and the raw request — that
 * the mock implementation has no use for.
 */
export interface WorkerContext extends HandlerContext {
  readonly db: Db;
  readonly env: Env;
  readonly request: Request;
  /** Fire-and-forget work that must not delay the response. */
  waitUntil(promise: Promise<unknown>): void;
}

/** Map a better-auth session onto the contract's `Session` shape. */
function toSession(raw: {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    role?: string | null;
    createdAt: Date | string;
  };
  session: { expiresAt: Date | string };
}): Session {
  const user: User = {
    id: raw.user.id,
    name: raw.user.name,
    email: raw.user.email,
    emailVerified: raw.user.emailVerified,
    imageUrl: raw.user.image ?? null,
    // Anything unrecognised degrades to the least-privileged role rather than
    // being trusted — a bad value must never read as "admin".
    role: normaliseRole(raw.user.role),
    createdAt: new Date(raw.user.createdAt).toISOString(),
  };
  return { user, expiresAt: new Date(raw.session.expiresAt).toISOString() };
}

function normaliseRole(value: unknown): User["role"] {
  return value === "advisor" || value === "admin" || value === "user" || value === "anon"
    ? value
    : "user";
}

export async function buildContext(opts: {
  auth: Auth;
  db: Db;
  env: Env;
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
}): Promise<WorkerContext> {
  const { auth, db, env, request, waitUntil } = opts;

  let session: Session | null = null;
  try {
    const raw = await auth.api.getSession({ headers: request.headers });
    if (raw?.user && raw.session) session = toSession(raw);
  } catch (error) {
    // A malformed or expired cookie is "signed out", not a 500.
    console.warn("session lookup failed", error);
  }

  // A suspended account keeps its data but loses access immediately, without
  // waiting for the session cookie to expire.
  if (session) {
    const [row] = await db
      .select({ suspendedAt: schema.user.suspendedAt })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);
    if (row?.suspendedAt) session = null;
  }

  const requireUser = (): User => {
    if (!session) throw apiError("UNAUTHENTICATED", "Sign in to continue");
    return session.user;
  };

  const requireAdvisor = (): User => {
    const user = requireUser();
    if (user.role !== "advisor" && user.role !== "admin") {
      throw apiError("FORBIDDEN", "This endpoint is for advisors");
    }
    return user;
  };

  return { session, requireUser, requireAdvisor, db, env, request, waitUntil };
}
