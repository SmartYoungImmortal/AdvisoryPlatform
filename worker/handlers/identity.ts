import { and, eq, inArray, or, sql } from "drizzle-orm";

import type { Handlers, InputOf, OutputOf } from "@/lib/api/contract";
import { apiError } from "@/lib/api/errors";
import type { User } from "@/lib/api/schema";

import { createAuth } from "../auth";
import type { WorkerContext } from "../context";
import { schema } from "../db";

/**
 * Identity — the session, the advisee's own profile card, and the two
 * destructive account operations.
 *
 * Every endpoint here acts on the caller's own row, and only `profile.setPhoto`
 * takes an id from the client at all. That id is still constrained by `userId`
 * inside the WHERE clause rather than compared after the row comes back: an
 * ownership check placed after the fetch is one early return away from handing
 * someone else's file to the wrong account.
 */

type IdentityKey =
  | "session.get"
  | "profile.get"
  | "profile.update"
  | "profile.setPhoto"
  | "account.changePassword"
  | "account.delete";

/**
 * The contract types `ctx` as the shared `HandlerContext` so that the mock
 * backend and the Worker can implement one interface. Under
 * `strictFunctionTypes` parameters are contravariant, so a handler that asks
 * for the richer `WorkerContext` is *not* assignable to that signature.
 * Declaring the domain against `WorkerContext` and widening once on export
 * keeps every input and output checked against the contract while still giving
 * the handlers `ctx.db` — the alternative, casting `ctx` inside each handler,
 * repeats the same assertion six times.
 */
type IdentityDomain = {
  [K in IdentityKey]: (input: InputOf<K>, ctx: WorkerContext) => Promise<OutputOf<K>>;
};

/** The line under the name on the identity card when the caller is not an advisor. */
const ADVISEE_SUBTITLE = "ผู้รับคำปรึกษา";

/**
 * Bookings that are still ahead of the advisee — the middle counter on the
 * card. `in-progress` counts as upcoming rather than past: the call has not
 * finished, so it is not yet a consultation the profile can claim.
 */
const OPEN_BOOKING_STATUSES = ["pending-payment", "confirmed", "in-progress"];

/**
 * A booking in either of these states is an obligation between two people — an
 * advisee owes money or an advisor owes an hour — so the account cannot go away
 * underneath it. `in-progress` is deliberately absent: a call that is live
 * cannot also be having its account deleted in another tab, and blocking on it
 * would strand anyone whose session never got closed out.
 */
const BLOCKING_BOOKING_STATUSES = ["pending-payment", "confirmed"];

/** Every column `S.User` needs, in one place — three handlers return this shape. */
const userColumns = {
  id: schema.user.id,
  name: schema.user.name,
  email: schema.user.email,
  emailVerified: schema.user.emailVerified,
  image: schema.user.image,
  role: schema.user.role,
  createdAt: schema.user.createdAt,
};

interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  createdAt: Date;
}

/**
 * `role` is free text in the database so that adding a role stays a code change
 * rather than a migration with a table lock. Anything unrecognised degrades to
 * the least-privileged role — a typo in that column must never read as "admin".
 * Mirrors `normaliseRole` in `worker/context.ts`.
 */
function asRole(value: string): User["role"] {
  return value === "advisor" || value === "admin" || value === "anon" ? value : "user";
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    imageUrl: row.image,
    role: asRole(row.role),
    // The driver hands back a `Date`; the contract is ISO 8601 UTC strings.
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * better-auth rejects with a `better-call` APIError whose `body.code` names the
 * failure. Read it defensively — an unrecognised shape means the failure was not
 * one of the ones translated below, and those must surface as 500s rather than
 * be mislabelled as a wrong password.
 */
function authErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const body = (error as { body?: unknown }).body;
  if (typeof body !== "object" || body === null) return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

const identityDomain = {
  /**
   * Public by contract: signed out is 200 + `null`. A 401 here would make every
   * first paint look like a failure to the client and push it into its
   * error-handling path on a perfectly normal anonymous visit.
   */
  "session.get": async (_input, ctx) => ctx.session,

  "profile.get": async (_input, ctx) => {
    const me = ctx.requireUser();

    /**
     * One statement, one subrequest. The three counters are scalar subqueries
     * rather than three round trips, and the advisor headline rides along on a
     * left join — the Free plan allows 50 subrequests per invocation and a
     * profile card is not where that budget should go.
     *
     * The user row is re-read rather than taken from `ctx.session` on purpose:
     * better-auth caches the session cookie for five minutes, so a name or a
     * photo changed a moment ago would otherwise keep rendering stale right
     * after the screen that changed it.
     */
    const [row] = await ctx.db
      .select({
        ...userColumns,
        headline: schema.advisorProfile.headline,
        consultations: sql<number>`(
          select count(*) from ${schema.booking}
          where ${and(eq(schema.booking.adviseeId, me.id), eq(schema.booking.status, "completed"))}
        )`.mapWith(Number),
        bookings: sql<number>`(
          select count(*) from ${schema.booking}
          where ${and(
            eq(schema.booking.adviseeId, me.id),
            inArray(schema.booking.status, OPEN_BOOKING_STATUSES),
          )}
        )`.mapWith(Number),
        // Reviews the caller wrote, including any an admin has since hidden:
        // the counter is a record of what they did, and silently decrementing it
        // after a moderation decision reads as data loss to the author.
        reviews: sql<number>`(
          select count(*) from ${schema.review}
          where ${eq(schema.review.authorId, me.id)}
        )`.mapWith(Number),
      })
      .from(schema.user)
      .leftJoin(schema.advisorProfile, eq(schema.advisorProfile.userId, schema.user.id))
      .where(eq(schema.user.id, me.id))
      .limit(1);

    if (!row) throw apiError("NOT_FOUND", "The signed-in user no longer exists");

    /**
     * `headline` is null for anyone without an advisor profile, and defaults to
     * "" for an advisor who has not written one yet — both fall back to the
     * advisee line, because a blank second row on the identity card reads as a
     * rendering bug.
     */
    const headline = row.headline?.trim();

    return {
      user: toUser(row),
      subtitle: headline ? headline : ADVISEE_SUBTITLE,
      stats: {
        consultations: row.consultations,
        bookings: row.bookings,
        reviews: row.reviews,
      },
    };
  },

  /**
   * Saves the edit-profile form.
   *
   * Only `name` has a column. `phone`, `birthDate` and `bio` are accepted by the
   * contract but there is nowhere on `user` to put them: the only columns of
   * those names live on `advisor_application`, which is reviewed KYC data, and
   * on `advisor_profile.bio`, which is public. The edit screen promises the
   * opposite — "ที่ปรึกษาจะเห็นเฉพาะชื่อที่แสดงและรูปโปรไฟล์" — so writing to
   * either would corrupt an identity record or publish a private field. They are
   * dropped until `user` grows private columns for them.
   */
  "profile.update": async (input, ctx) => {
    const me = ctx.requireUser();

    // `min(1)` in the schema still admits "   ", which renders as a nameless card
    // everywhere the name appears. Field keys are machine tokens, not prose — the
    // UI owns every string a Thai user reads.
    const name = input.name.trim();
    if (!name) {
      throw apiError("VALIDATION_FAILED", "Display name is blank", { name: "required" });
    }

    const [row] = await ctx.db
      .update(schema.user)
      .set({ name })
      .where(eq(schema.user.id, me.id))
      .returning(userColumns);

    if (!row) throw apiError("NOT_FOUND", "The signed-in user no longer exists");
    return toUser(row);
  },

  /**
   * Attaches an already-uploaded file as the profile photo.
   *
   * Every rejection returns the same UPLOAD_REJECTED code even when the real
   * cause is "that upload belongs to someone else" — telling the caller which ids
   * exist would turn this into an enumeration oracle over other people's files.
   * Only the log message distinguishes them.
   */
  "profile.setPhoto": async (input, ctx) => {
    const me = ctx.requireUser();

    const [file] = await ctx.db
      .select({
        status: schema.upload.status,
        purpose: schema.upload.purpose,
        publicUrl: schema.upload.publicUrl,
        rejectionReason: schema.upload.rejectionReason,
      })
      .from(schema.upload)
      // Ownership is part of the lookup, not a check afterwards.
      .where(and(eq(schema.upload.id, input.uploadId), eq(schema.upload.userId, me.id)))
      .limit(1);

    if (!file) {
      throw apiError("UPLOAD_REJECTED", `Upload ${input.uploadId} is not this user's`);
    }
    /**
     * `pending` means the browser's PUT was never confirmed, so the bytes may not
     * exist at all; `rejected` means moderation refused them. Neither may become
     * somebody's avatar.
     */
    if (file.status !== "complete") {
      throw apiError(
        "UPLOAD_REJECTED",
        `Upload ${input.uploadId} is ${file.status}` +
          (file.rejectionReason ? `: ${file.rejectionReason}` : ""),
      );
    }
    /**
     * An identity-document upload is a scan of a national ID, and `user.image` is
     * rendered publicly on every card and chat row. Accepting any completed
     * upload here would be a one-request path from "I verified my identity" to
     * "my ID is on the internet".
     */
    if (file.purpose !== "profile-photo") {
      throw apiError(
        "UPLOAD_REJECTED",
        `Upload ${input.uploadId} was created for ${file.purpose}, not a profile photo`,
      );
    }
    // The contract types `imageUrl` as a URL; a completed upload with no public
    // URL is a broken row, not a photo.
    if (!file.publicUrl) {
      throw apiError("UPLOAD_REJECTED", `Upload ${input.uploadId} has no public URL`);
    }

    const [row] = await ctx.db
      .update(schema.user)
      .set({ image: file.publicUrl })
      .where(eq(schema.user.id, me.id))
      .returning(userColumns);

    if (!row) throw apiError("NOT_FOUND", "The signed-in user no longer exists");
    return toUser(row);
  },

  /**
   * The current password is verified by better-auth rather than re-implemented
   * here: it owns the hash format and the constant-time comparison, and a second
   * implementation of either is a second chance to get them wrong.
   */
  "account.changePassword": async (input, ctx) => {
    ctx.requireUser();

    // `ctx` carries no auth instance, so build one — same per-request rule as
    // `worker/index.ts`, never hoisted to module scope.
    const auth = createAuth(ctx.env);

    try {
      await auth.api.changePassword({
        // The same cookie the session was built from, so better-auth resolves the
        // caller itself — this endpoint can never be pointed at another user.
        headers: ctx.request.headers,
        body: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
          /**
           * Off deliberately. `revokeOtherSessions` deletes *every* session
           * including the caller's, then re-issues one through a `Set-Cookie` on
           * better-auth's own Response — which this handler never returns, since
           * the router serialises the contract's JSON envelope instead. Turning
           * it on would silently sign the user out of the very device they just
           * changed their password on.
           */
          revokeOtherSessions: false,
        },
      });
    } catch (error) {
      const code = authErrorCode(error);

      // No credential account means they signed up another way and have no
      // current password at all. From the form's point of view that is the same
      // dead end, and /settings/password/wrong is the screen drawn for it.
      if (code === "INVALID_PASSWORD" || code === "CREDENTIAL_ACCOUNT_NOT_FOUND") {
        throw apiError("INVALID_CREDENTIALS", "Current password does not match");
      }
      if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") {
        throw apiError("WEAK_PASSWORD", `New password rejected by the policy: ${code}`);
      }
      throw error;
    }

    return { ok: true };
  },

  /**
   * Soft-deletes the account.
   *
   * Never a hard delete: `invoice` and `payment` reference the user with
   * `onDelete: "restrict"` precisely because the financial record has to outlive
   * the account. Setting `suspendedAt` is what `buildContext` already reads to
   * cut access off on the very next request.
   */
  "account.delete": async (input, ctx) => {
    const me = ctx.requireUser();

    // The screen asks the user to type DELETE (messages/th.json →
    // deleteAccount.confirmLabel). Case-insensitive: a mobile keyboard with
    // autocapitalise off must not be the reason somebody cannot close their
    // account.
    if (input.confirmText.trim().toUpperCase() !== "DELETE") {
      throw apiError("VALIDATION_FAILED", "Confirmation text does not match", {
        confirmText: "mismatch",
      });
    }

    /**
     * Both blocking conditions in one statement. The caller is checked on both
     * sides of the booking — an advisor with an hour still owed is as blocked as
     * the advisee waiting on it — and money in escrow blocks even when the
     * booking itself has finished, because the funds have not moved yet.
     */
    const [blocker] = await ctx.db
      .select({
        bookingId: schema.booking.id,
        status: schema.booking.status,
        escrowState: schema.escrow.state,
      })
      .from(schema.booking)
      .leftJoin(schema.escrow, eq(schema.escrow.bookingId, schema.booking.id))
      .where(
        and(
          or(eq(schema.booking.adviseeId, me.id), eq(schema.booking.advisorId, me.id)),
          or(
            inArray(schema.booking.status, BLOCKING_BOOKING_STATUSES),
            eq(schema.escrow.state, "held"),
          ),
        ),
      )
      .limit(1);

    if (blocker) {
      throw apiError(
        "DELETION_BLOCKED",
        `Booking ${blocker.bookingId} is ${blocker.status}` +
          (blocker.escrowState === "held" ? " with funds still in escrow" : ""),
      );
    }

    /**
     * `batch`, not a transaction — neon-http has no interactive ones. Suspend
     * first so that a partial failure leaves the account locked rather than
     * signed in and un-deletable.
     *
     * Dropping the session rows is belt and braces: `buildContext` re-reads
     * `suspendedAt` on every request, so access is already gone. It also clears
     * the five-minute cookie cache better-auth would otherwise keep serving from.
     */
    await ctx.db.batch([
      ctx.db.update(schema.user).set({ suspendedAt: new Date() }).where(eq(schema.user.id, me.id)),
      ctx.db.delete(schema.session).where(eq(schema.session.userId, me.id)),
    ]);

    return { ok: true };
  },
} satisfies IdentityDomain;

/** See `IdentityDomain` — the widening that lets `handlers/index.ts` compile. */
export const identityHandlers = identityDomain as Pick<Handlers, IdentityKey>;
