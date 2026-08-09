import type { BatchItem } from "drizzle-orm/batch";
import { and, asc, desc, eq, gte, isNull, notInArray, sql } from "drizzle-orm";

import type { EndpointKey, InputOf, OutputOf } from "@/lib/api/contract";
import { apiError } from "@/lib/api/errors";
import type { Payout, PayoutStatus, Review } from "@/lib/api/schema";

import type { WorkerContext } from "../context";
import { schema } from "../db";

/**
 * The advisor's own side of the platform: profile, skills, money, and the
 * review threads they appear in.
 *
 * `reviews.list` and `reviews.summary` live here rather than with the advisee
 * endpoints because they read the same rows as `reviews.reply` — keeping the
 * projection and the "hidden means invisible" rule in one file is what stops
 * an admin-hidden review reappearing through the public list.
 */

/**
 * `Pick<Handlers, K>` with one substitution: `ctx` is the Worker's
 * `WorkerContext`, not the contract's narrower `HandlerContext`.
 *
 * The substitution is forced, not a preference. Under `strictFunctionTypes` a
 * parameter is contravariant, so a handler that *demands* `db` cannot be
 * assigned to a signature that only *promises* a session — `satisfies
 * Pick<Handlers, …>` rejects every handler in this file. Inputs and outputs
 * still come straight from the contract, so the property that matters is
 * intact: a wrong return shape is a compile error here, not a 500 in
 * production.
 */
type WorkerHandlers<K extends EndpointKey> = {
  [P in K]: (input: InputOf<P>, ctx: WorkerContext) => Promise<OutputOf<P>>;
};

// ── Shared helpers ───────────────────────────────────────────────────────────

const THB = "THB" as const;

function money(amountMinor: number) {
  return { amountMinor, currency: THB };
}

/**
 * Start of the current calendar month in Asia/Bangkok, as a `timestamptz`.
 *
 * The platform bills and reports in Thai local time, so a session at 06:00 on
 * the 1st (23:00 UTC on the last of the previous month) belongs to the new
 * month. Computing this in Postgres rather than JS keeps the boundary in one
 * place and lets it be compared against an indexed column.
 */
const bangkokMonthStart = sql`date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok'`;

/** Postgres SQLSTATEs we translate rather than let surface as INTERNAL. */
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

function pgErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/**
 * Keyset cursors, opaque to the client (the contract promises nothing about
 * their contents). Keyed on a timestamp *plus* the id so two rows written in
 * the same millisecond cannot make a page repeat or skip — an offset cursor
 * would do exactly that as new rows arrive above the window.
 */
function encodeCursor(at: Date, id: string): string {
  return btoa(`${at.toISOString()}|${id}`);
}

function decodeCursor(raw: string): { at: string; id: string } {
  const malformed = () =>
    apiError("VALIDATION_FAILED", "Malformed cursor", { cursor: "Malformed cursor" });

  let decoded: string;
  try {
    decoded = atob(raw);
  } catch {
    throw malformed();
  }

  const separator = decoded.indexOf("|");
  if (separator < 1) throw malformed();

  const at = decoded.slice(0, separator);
  const id = decoded.slice(separator + 1);
  if (!id || Number.isNaN(Date.parse(at))) throw malformed();
  return { at, id };
}

/**
 * `status` is plain text in the database so adding a state is a code change
 * rather than a migration with a table lock. Anything unrecognised degrades to
 * "scheduled": claiming money is already "paid" on the strength of a value we
 * do not understand is the one wrong answer here.
 */
function normalisePayoutStatus(value: string): PayoutStatus {
  return value === "processing" || value === "paid" || value === "failed" ? value : "scheduled";
}

/** e.g. "ปรึกษาโปรเจกต์จบ · 60 นาที" — the session a review card is about. */
function sessionLabel(serviceTitle: string | null, durationMinutes: number): string {
  const minutes = `${durationMinutes} นาที`;
  return serviceTitle ? `${serviceTitle} · ${minutes}` : minutes;
}

/**
 * Everything a `Review` needs, in one row. Author, booking and service are
 * joined rather than fetched per card — a review list is the textbook N+1, and
 * three extra queries per row would clear the Free plan's 50-subrequest ceiling
 * before the second page.
 */
const reviewColumns = {
  id: schema.review.id,
  rating: schema.review.rating,
  body: schema.review.body,
  createdAt: schema.review.createdAt,
  replyBody: schema.review.replyBody,
  replyAt: schema.review.replyAt,
  authorName: schema.user.name,
  authorImage: schema.user.image,
  durationMinutes: schema.booking.durationMinutes,
  serviceTitle: schema.service.title,
};

function selectReviews(db: WorkerContext["db"]) {
  return db
    .select(reviewColumns)
    .from(schema.review)
    .innerJoin(schema.user, eq(schema.user.id, schema.review.authorId))
    .innerJoin(schema.booking, eq(schema.booking.id, schema.review.bookingId))
    // Left, not inner: a service can be deleted (`on delete set null`) long
    // after the review was written, and losing the review with it would be
    // rewriting history.
    .leftJoin(schema.service, eq(schema.service.id, schema.booking.serviceId));
}

function toReview(row: {
  id: string;
  rating: number;
  body: string;
  createdAt: Date;
  replyBody: string | null;
  replyAt: Date | null;
  authorName: string;
  authorImage: string | null;
  durationMinutes: number;
  serviceTitle: string | null;
}): Review {
  return {
    id: row.id,
    authorName: row.authorName,
    authorImageUrl: row.authorImage,
    sessionLabel: sessionLabel(row.serviceTitle, row.durationMinutes),
    rating: row.rating,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    reply: row.replyBody
      ? { body: row.replyBody, createdAt: (row.replyAt ?? row.createdAt).toISOString() }
      : null,
  };
}

/**
 * A skills list longer than this is not a profile, it is an abuse of the batch
 * — every entry becomes one statement in a single round trip.
 */
const MAX_SKILLS = 30;

// ── Handlers ─────────────────────────────────────────────────────────────────

export const advisorHandlers = {
  "advisor.me": async (_input, ctx: WorkerContext) => {
    const me = ctx.requireAdvisor();

    const [profile] = await ctx.db
      .select({
        headline: schema.advisorProfile.headline,
        bio: schema.advisorProfile.bio,
        acceptingRequests: schema.advisorProfile.acceptingRequests,
        ratingSum: schema.advisorProfile.ratingSum,
        ratingCount: schema.advisorProfile.ratingCount,
        sessionCount: schema.advisorProfile.sessionCount,
        name: schema.user.name,
        image: schema.user.image,
        /**
         * The profile advertises one hourly figure but an advisor publishes
         * several services of different lengths, so normalise each to 60
         * minutes and take the cheapest — the "from ฿x/hour" the card shows.
         * A correlated subquery keeps this in the same round trip as the
         * profile row.
         */
        hourlyRateMinor: sql<number | null>`(
          select min(round(${schema.service.priceMinor}::numeric * 60 / nullif(${schema.service.durationMinutes}, 0)))::int
          from ${schema.service}
          where ${schema.service.advisorId} = ${schema.advisorProfile.userId}
            and ${schema.service.status} = 'published'
        )`,
      })
      .from(schema.advisorProfile)
      .innerJoin(schema.user, eq(schema.user.id, schema.advisorProfile.userId))
      // Unlike `advisors.get` this deliberately does NOT filter on verifiedAt:
      // an advisor still in review must be able to see and edit the profile
      // they are being reviewed on.
      .where(eq(schema.advisorProfile.userId, me.id))
      .limit(1);

    if (!profile) throw apiError("NOT_FOUND", "No advisor profile for this account");

    const skills = await ctx.db
      .select({ id: schema.advisorSkill.id, name: schema.advisorSkill.name })
      .from(schema.advisorSkill)
      .where(eq(schema.advisorSkill.advisorId, me.id))
      .orderBy(asc(schema.advisorSkill.position), asc(schema.advisorSkill.id));

    return {
      id: me.id,
      name: profile.name,
      imageUrl: profile.image,
      field: profile.headline,
      bio: profile.bio,
      hourlyRate: money(profile.hourlyRateMinor ?? 0),
      stats: {
        // One decimal, matching the star row. Guard the divide: a brand-new
        // advisor has ratingCount 0 and must read 0, not NaN.
        rating:
          profile.ratingCount > 0
            ? Math.round((profile.ratingSum / profile.ratingCount) * 10) / 10
            : 0,
        sessions: profile.sessionCount,
        reviews: profile.ratingCount,
      },
      // `meta` has no column behind it — there is no per-skill session count or
      // credential link in the schema — so it is sent empty rather than
      // invented. The UI renders no muted line for an empty string.
      skills: skills.map((skill) => ({ id: skill.id, name: skill.name, meta: "" })),
      acceptingRequests: profile.acceptingRequests,
    };
  },

  "advisor.saveSkills": async (input, ctx: WorkerContext) => {
    const me = ctx.requireAdvisor();

    if (input.skills.length > MAX_SKILLS) {
      throw apiError("VALIDATION_FAILED", `At most ${MAX_SKILLS} skills`, {
        skills: `At most ${MAX_SKILLS} skills`,
      });
    }

    const keptIds = input.skills
      .map((skill) => skill.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const statements: BatchItem<"pg">[] = [
      // Delete first, and always scoped to the caller. Anything the client did
      // not send back is a removal — that is what "replace the list" means.
      ctx.db
        .delete(schema.advisorSkill)
        .where(
          keptIds.length
            ? and(
                eq(schema.advisorSkill.advisorId, me.id),
                notInArray(schema.advisorSkill.id, keptIds),
              )
            : eq(schema.advisorSkill.advisorId, me.id),
        ),
    ];

    input.skills.forEach((skill, index) => {
      if (skill.id) {
        statements.push(
          ctx.db
            .update(schema.advisorSkill)
            // `advisorId` in the WHERE, not a check after the read: an id
            // belonging to another advisor must match zero rows rather than be
            // renamed. It is silently dropped, which is the safe direction.
            .set({ name: skill.name, position: index })
            .where(
              and(
                eq(schema.advisorSkill.id, skill.id),
                eq(schema.advisorSkill.advisorId, me.id),
              ),
            ),
        );
      } else {
        statements.push(
          ctx.db
            .insert(schema.advisorSkill)
            .values({ advisorId: me.id, name: skill.name, position: index }),
        );
      }
    });

    // neon-http has no interactive transactions; a batch is the only way to get
    // the delete and the re-insert to land or fail together, which matters
    // because a half-applied replace leaves the profile with no skills at all.
    try {
      await ctx.db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
    } catch (error) {
      if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) {
        throw apiError("NOT_FOUND", "No advisor profile for this account");
      }
      throw error;
    }

    // Re-read rather than assemble from the input: the insert generates the ids
    // the client needs to send back next time.
    const rows = await ctx.db
      .select({ id: schema.advisorSkill.id, name: schema.advisorSkill.name })
      .from(schema.advisorSkill)
      .where(eq(schema.advisorSkill.advisorId, me.id))
      .orderBy(asc(schema.advisorSkill.position), asc(schema.advisorSkill.id));

    return rows.map((row) => ({ id: row.id, name: row.name, meta: "" }));
  },

  "earnings.get": async (_input, ctx: WorkerContext) => {
    const me = ctx.requireAdvisor();

    // All four figures in one statement. Three separate sums would be three
    // subrequests for numbers that must agree with each other anyway — and
    // reading them at three different instants is how a balance card ends up
    // showing available + pending ≠ total.
    const [totals] = await ctx.db
      .select({
        releasedMinor: sql<number>`coalesce(sum(case when ${schema.escrow.state} = 'released' then ${schema.escrow.advisorShareMinor} else 0 end), 0)::int`,
        pendingMinor: sql<number>`coalesce(sum(case when ${schema.escrow.state} = 'held' then ${schema.escrow.advisorShareMinor} else 0 end), 0)::int`,
        monthToDateMinor: sql<number>`coalesce(sum(case when ${schema.escrow.state} = 'released' and ${schema.escrow.releasedAt} >= ${bangkokMonthStart} then ${schema.escrow.advisorShareMinor} else 0 end), 0)::int`,
        /**
         * No column links an escrow row to the payout that swept it up, so
         * "released but not yet paid out" can only be answered in aggregate:
         * everything released, minus everything already committed to a
         * transfer. A failed payout is excluded because that money came back.
         */
        paidOutMinor: sql<number>`coalesce((
          select sum(${schema.payout.amountMinor})
          from ${schema.payout}
          where ${schema.payout.advisorId} = ${me.id}
            and ${schema.payout.status} <> 'failed'
        ), 0)::int`,
      })
      .from(schema.escrow)
      // Escrow hangs off the booking, which is what carries the advisor.
      .innerJoin(schema.booking, eq(schema.booking.id, schema.escrow.bookingId))
      .where(eq(schema.booking.advisorId, me.id));

    const released = totals?.releasedMinor ?? 0;
    const paidOut = totals?.paidOutMinor ?? 0;

    const breakdown = await ctx.db
      .select({
        // The design labels each row with the advisee, not the service.
        label: schema.user.name,
        amountMinor: sql<number>`coalesce(${schema.escrow.advisorShareMinor}, 0)::int`,
      })
      .from(schema.booking)
      .innerJoin(schema.user, eq(schema.user.id, schema.booking.adviseeId))
      // Left: a completed session whose escrow row has not been written yet
      // still belongs in the list, at ฿0, rather than vanishing from it.
      .leftJoin(schema.escrow, eq(schema.escrow.bookingId, schema.booking.id))
      .where(
        and(
          eq(schema.booking.advisorId, me.id),
          eq(schema.booking.status, "completed"),
          // Dated by when the session happened, which is what the advisee
          // remembers — not by when the money moved.
          gte(schema.booking.startAt, bangkokMonthStart),
        ),
      )
      .orderBy(desc(schema.booking.startAt))
      // The card is a summary, not a ledger; `transactions.list` is paginated
      // and is where a full month belongs.
      .limit(50);

    return {
      // Clamp: a manual or over-issued transfer must read ฿0, never a negative
      // balance the withdraw button would happily submit.
      available: money(Math.max(0, released - paidOut)),
      pending: money(totals?.pendingMinor ?? 0),
      monthToDate: money(totals?.monthToDateMinor ?? 0),
      breakdown: breakdown.map((row) => ({
        label: row.label,
        amount: money(row.amountMinor),
      })),
    };
  },

  "payouts.list": async (input, ctx: WorkerContext) => {
    const me = ctx.requireAdvisor();
    const cursor = input.cursor ? decodeCursor(input.cursor) : null;

    const rows = await ctx.db
      .select({
        id: schema.payout.id,
        amountMinor: schema.payout.amountMinor,
        status: schema.payout.status,
        scheduledFor: schema.payout.scheduledFor,
        paidAt: schema.payout.paidAt,
        failureReason: schema.payout.failureReason,
      })
      .from(schema.payout)
      .where(
        and(
          eq(schema.payout.advisorId, me.id),
          cursor
            ? sql`(${schema.payout.scheduledFor}, ${schema.payout.id}) < (${cursor.at}::timestamptz, ${cursor.id})`
            : undefined,
        ),
      )
      // Ordered on `scheduledFor` rather than `paidAt`: the latter is null
      // until settlement, and a null sort key cannot anchor a keyset cursor.
      .orderBy(desc(schema.payout.scheduledFor), desc(schema.payout.id))
      // One extra row is how we learn there is a next page without a count(*).
      .limit(input.limit + 1);

    const page = rows.slice(0, input.limit);
    const last = page.at(-1);

    const items: Payout[] = page.map((row) => {
      const status = normalisePayoutStatus(row.status);
      return {
        id: row.id,
        amount: money(row.amountMinor),
        // Settled date when there is one, expected date otherwise — the
        // contract's `date` is "when it settled, or is expected to".
        date: (row.paidAt ?? row.scheduledFor).toISOString(),
        status,
        // The failure screen keys off this being non-null, so a stale reason
        // left on a retried payout must not leak into a successful row.
        failureReason: status === "failed" ? row.failureReason : null,
      };
    });

    return {
      items,
      nextCursor:
        rows.length > input.limit && last ? encodeCursor(last.scheduledFor, last.id) : null,
    };
  },

  "payouts.account": async (_input, ctx: WorkerContext) => {
    const me = ctx.requireAdvisor();

    const [row] = await ctx.db
      .select({
        bankName: schema.payoutAccount.bankName,
        accountLast4: schema.payoutAccount.accountLast4,
        accountName: schema.payoutAccount.accountName,
        verified: schema.payoutAccount.verified,
      })
      .from(schema.payoutAccount)
      .where(eq(schema.payoutAccount.advisorId, me.id))
      .limit(1);

    // Null is the "no account yet" screen, not an error.
    if (!row) return null;

    return {
      bankName: row.bankName,
      // The contract fixes this at 4 characters; pad a short legacy value
      // rather than fail the response schema on the client.
      accountLast4: row.accountLast4.slice(-4).padStart(4, "0"),
      accountName: row.accountName,
      verified: row.verified,
    };
  },

  "payouts.saveAccount": async (input, ctx: WorkerContext) => {
    const me = ctx.requireAdvisor();

    // The full number is never stored. It goes to the payment provider, which
    // hands back a recipient id; all this row keeps is enough for a human to
    // recognise their own account.
    const digits = input.accountNumber.replace(/\D/g, "");
    if (digits.length < 4) {
      throw apiError("VALIDATION_FAILED", "Account number needs at least 4 digits", {
        accountNumber: "Account number needs at least 4 digits",
      });
    }
    const accountLast4 = digits.slice(-4);

    const values = {
      bankName: input.bankName,
      accountLast4,
      accountName: input.accountName,
      // Pointing at a different account resets both the verification and the
      // provider handle — the old recipient id belongs to the old account, and
      // paying out to it after an "edit" would send money to the wrong place.
      verified: false,
      omiseRecipientId: null,
    };

    let row;
    try {
      [row] = await ctx.db
        .insert(schema.payoutAccount)
        .values({ advisorId: me.id, ...values })
        .onConflictDoUpdate({
          target: schema.payoutAccount.advisorId,
          set: { ...values, updatedAt: new Date() },
        })
        .returning({
          bankName: schema.payoutAccount.bankName,
          accountLast4: schema.payoutAccount.accountLast4,
          accountName: schema.payoutAccount.accountName,
          verified: schema.payoutAccount.verified,
        });
    } catch (error) {
      if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) {
        throw apiError("NOT_FOUND", "No advisor profile for this account");
      }
      throw error;
    }

    if (!row) throw apiError("INTERNAL", "Payout account was not written");
    return row;
  },

  "reviews.list": async (input, ctx: WorkerContext) => {
    const cursor = input.cursor ? decodeCursor(input.cursor) : null;

    const rows = await selectReviews(ctx.db)
      .where(
        and(
          eq(schema.review.advisorId, input.advisorId),
          // An admin hid this after a report. It stays in the table as
          // evidence and stays out of every public read.
          isNull(schema.review.hiddenAt),
          cursor
            ? sql`(${schema.review.createdAt}, ${schema.review.id}) < (${cursor.at}::timestamptz, ${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(desc(schema.review.createdAt), desc(schema.review.id))
      .limit(input.limit + 1);

    const page = rows.slice(0, input.limit);
    const last = page.at(-1);

    return {
      items: page.map(toReview),
      nextCursor:
        rows.length > input.limit && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  },

  "reviews.summary": async (input, ctx: WorkerContext) => {
    // One grouped query gives all five bars. Five `count(*)` queries would be
    // five subrequests to answer a question Postgres answers in one pass.
    const rows = await ctx.db
      .select({
        rating: schema.review.rating,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.review)
      .where(
        and(eq(schema.review.advisorId, input.advisorId), isNull(schema.review.hiddenAt)),
      )
      .groupBy(schema.review.rating);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let weighted = 0;

    for (const row of rows) {
      // Anything outside 1–5 is corrupt and is left out of both the bars and
      // the average rather than distorting them.
      if (row.rating < 1 || row.rating > 5) continue;
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row.count;
      total += row.count;
      weighted += row.rating * row.count;
    }

    return {
      average: total > 0 ? Math.round((weighted / total) * 10) / 10 : 0,
      total,
      distribution,
    };
  },

  "reviews.submit": async (input, ctx: WorkerContext) => {
    const me = ctx.requireUser();

    // Ownership is in the WHERE, not a comparison afterwards: this must not be
    // able to tell a caller that someone else's booking exists.
    const [booking] = await ctx.db
      .select({
        id: schema.booking.id,
        status: schema.booking.status,
        advisorId: schema.booking.advisorId,
        durationMinutes: schema.booking.durationMinutes,
        serviceTitle: schema.service.title,
      })
      .from(schema.booking)
      .leftJoin(schema.service, eq(schema.service.id, schema.booking.serviceId))
      .where(and(eq(schema.booking.id, input.bookingId), eq(schema.booking.adviseeId, me.id)))
      .limit(1);

    if (!booking) throw apiError("NOT_FOUND", "No such booking");

    // Cancelled, no-show and still-upcoming sessions are all "nothing to
    // review yet" — the frontend has one screen for that, keyed on this code.
    if (booking.status !== "completed") {
      throw apiError("NOT_ELIGIBLE", "Only a completed session can be reviewed");
    }

    let created;
    try {
      // Both statements in one batch. The denormalised rating on
      // `advisor_profile` exists so the advisor list needs no per-card
      // subquery, which only holds if it can never drift from the reviews —
      // so the increment must not survive a failed insert.
      const [inserted] = await ctx.db.batch([
        ctx.db
          .insert(schema.review)
          .values({
            bookingId: booking.id,
            advisorId: booking.advisorId,
            authorId: me.id,
            rating: input.rating,
            body: input.body,
          })
          .returning({ id: schema.review.id, createdAt: schema.review.createdAt }),
        ctx.db
          .update(schema.advisorProfile)
          .set({
            ratingSum: sql`${schema.advisorProfile.ratingSum} + ${input.rating}`,
            ratingCount: sql`${schema.advisorProfile.ratingCount} + 1`,
          })
          .where(eq(schema.advisorProfile.userId, booking.advisorId)),
      ]);
      created = inserted[0];
    } catch (error) {
      // `review_booking_uidx` is the real guard against a double review — a
      // pre-flight SELECT would still lose the race between two taps on a
      // flaky connection. Translate the violation into the screen for it.
      if (pgErrorCode(error) === UNIQUE_VIOLATION) {
        throw apiError("ALREADY_REVIEWED", "This session has already been reviewed");
      }
      throw error;
    }

    if (!created) throw apiError("INTERNAL", "Review was not written");

    // Author and session are already known — re-reading them would be a
    // subrequest spent on data this handler was just holding.
    return {
      id: created.id,
      authorName: me.name,
      authorImageUrl: me.imageUrl,
      sessionLabel: sessionLabel(booking.serviceTitle, booking.durationMinutes),
      rating: input.rating,
      body: input.body,
      createdAt: created.createdAt.toISOString(),
      reply: null,
    };
  },

  "reviews.reply": async (input, ctx: WorkerContext) => {
    const me = ctx.requireAdvisor();

    // Ownership and the "not already replied" rule are both conditions on the
    // UPDATE, so two concurrent replies cannot both win: the second matches
    // zero rows instead of overwriting the first.
    const [updated] = await ctx.db
      .update(schema.review)
      .set({ replyBody: input.body, replyAt: new Date() })
      .where(
        and(
          eq(schema.review.id, input.reviewId),
          eq(schema.review.advisorId, me.id),
          isNull(schema.review.replyBody),
        ),
      )
      .returning({ id: schema.review.id });

    if (!updated) {
      // Zero rows means one of two different things; only ask which on the
      // failure path, so the happy path stays at two round trips.
      const [existing] = await ctx.db
        .select({ id: schema.review.id })
        .from(schema.review)
        .where(and(eq(schema.review.id, input.reviewId), eq(schema.review.advisorId, me.id)))
        .limit(1);

      // Someone else's review answers NOT_FOUND too — "exists but is not
      // yours" is itself information an advisor should not be able to probe.
      if (!existing) throw apiError("NOT_FOUND", "No such review");
      throw apiError("CONFLICT", "This review already has a reply");
    }

    const [row] = await selectReviews(ctx.db)
      .where(eq(schema.review.id, updated.id))
      .limit(1);

    if (!row) throw apiError("NOT_FOUND", "No such review");
    return toReview(row);
  },
} satisfies WorkerHandlers<
  | "advisor.me"
  | "advisor.saveSkills"
  | "earnings.get"
  | "payouts.list"
  | "payouts.account"
  | "payouts.saveAccount"
  | "reviews.list"
  | "reviews.summary"
  | "reviews.submit"
  | "reviews.reply"
>;
