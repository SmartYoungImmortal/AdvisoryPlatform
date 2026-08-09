import { and, desc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";

import type { EndpointKey, Handlers, InputOf, OutputOf } from "@/lib/api/contract";
import { apiError } from "@/lib/api/errors";
import type { ChatMessage, ChatMessageBody, Notification } from "@/lib/api/schema";

import type { WorkerContext } from "../context";
import type { Db } from "../db";
import { schema } from "../db";

/**
 * Chat and notifications.
 *
 * Two things shape every query in here:
 *
 * 1. **Both sides of a thread are users.** `chat_thread` stores `advisorId` and
 *    `adviseeId`, and the caller may be either — so ownership is always
 *    `advisorId = me OR adviseeId = me`, and the "partner" is whichever column
 *    the caller is *not* in.
 * 2. **50 subrequests per invocation.** The inbox resolves partner identity,
 *    preview and unread count in one statement rather than three per row; a
 *    per-thread lookup would blow the ceiling at ~16 conversations.
 */

// ── Wiring ───────────────────────────────────────────────────────────────────

type WorkerHandler<K extends EndpointKey> = (
  input: InputOf<K>,
  ctx: WorkerContext,
) => Promise<OutputOf<K>>;

/**
 * Adapts a handler that wants the Worker's context to the contract's shared one.
 *
 * The contract types `ctx` as `HandlerContext` — the subset the mock backend can
 * also provide — and under `strictFunctionTypes` that parameter is
 * contravariant, so a function asking for the richer `WorkerContext` is not
 * assignable to `Handlers[K]` even though `worker/index.ts` never passes
 * anything else. This is the single place that gap is bridged, which is what
 * lets the object below still be checked against the contract with `satisfies`.
 */
function h<K extends EndpointKey>(fn: WorkerHandler<K>): Handlers[K] {
  return fn as Handlers[K];
}

// ── Tuning ───────────────────────────────────────────────────────────────────

/**
 * The inbox has no cursor in the contract, so it has to be bounded here. Rows
 * are newest-first, so this is "the 200 most recent conversations" — which is
 * what the screen shows anyway, and it keeps one pathological account from
 * spending the whole CPU budget serialising JSON.
 */
const INBOX_LIMIT = 200;

/** Same reasoning as `INBOX_LIMIT`: `notifications.list` returns a bare array. */
const NOTIFICATION_LIMIT = 100;

/** `preview` is one 12/18 line in the design; sending a whole message wastes bytes. */
const PREVIEW_MAX_CHARS = 80;

/**
 * Attachment dimensions are not stored anywhere — `upload` has bytes and a
 * content type, no pixels. The bubble renders `object-cover` inside a fixed box,
 * so these numbers are only an aspect-ratio hint; a square is the least wrong
 * guess, and zero would risk a divide-by-zero in anything that computes a ratio.
 */
const UNKNOWN_IMAGE_SIDE = 1024;

// ── Off-platform detection ───────────────────────────────────────────────────

/**
 * Taking the deal off-platform is how the marketplace loses its fee and the
 * advisee loses every protection that comes with paying through it. A hit
 * records a flag for a human to judge — it never blocks the message, because a
 * false positive on a legitimate consult ("โทร 02-xxx ตอนบ่าย") costs more than
 * the leakage does.
 */
export interface OffPlatformHit {
  /** `policy_flag.reason` — the bucket a moderator filters on. */
  readonly reason: "off-platform-contact" | "bank-details";
  /** Which rule fired, so thresholds can be tuned from the flag table later. */
  readonly detector: "phone" | "line-id" | "bank-account" | "keyword";
  readonly severity: "low" | "medium" | "high";
  readonly excerpt: string;
}

const SEVERITY_RANK: Record<OffPlatformHit["severity"], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

/** Thai digits are the obvious way to write a phone number past an ASCII regex. */
const THAI_DIGITS = /[๐-๙]/g;

/**
 * Explicit intent, so ranked above a bare number: "โอนตรง" (pay me directly) and
 * "นอกระบบ" (off the books) are the deal being moved, not a digit string that
 * merely could be a phone.
 */
const KEYWORDS: readonly { readonly word: string; readonly severity: OffPlatformHit["severity"] }[] =
  [
    { word: "โอนตรง", severity: "high" },
    { word: "นอกระบบ", severity: "high" },
    { word: "ไลน์ไอดี", severity: "medium" },
  ];

/** "line id" / "LINE ID:" and the bare `@handle` form LINE accounts use. */
const LINE_ID_RE = /line[ .:]?id|@[a-z0-9._-]{4,}/i;

/** Runs long enough to be a phone or an account number, after separators go. */
const DIGIT_RUN_RE = /\d{9,15}/g;

const EXCERPT_RADIUS = 40;
const EXCERPT_MAX_CHARS = 160;

/**
 * Scan one message for an attempt to move the conversation off-platform.
 *
 * Exported and pure so the thresholds can be unit-tested against real Thai
 * message text without standing up a database.
 *
 * Only the strongest hit is returned: one message produces at most one
 * `policy_flag` row, otherwise a single "โอนตรงมาที่ 1234567890 line id abc"
 * would fan out into three items in the moderation queue for one offence.
 */
export function detectOffPlatformContact(text: string): OffPlatformHit | null {
  // Thai numerals first, so every rule below can assume ASCII digits.
  const normalised = text.replace(THAI_DIGITS, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0x0e50 + 0x30),
  );
  const hits: OffPlatformHit[] = [];

  for (const { word, severity } of KEYWORDS) {
    const at = normalised.indexOf(word);
    if (at !== -1) {
      hits.push({
        reason: "off-platform-contact",
        detector: "keyword",
        severity,
        excerpt: excerptAround(normalised, at, word.length),
      });
    }
  }

  const line = LINE_ID_RE.exec(normalised);
  if (line) {
    hits.push({
      reason: "off-platform-contact",
      detector: "line-id",
      severity: "medium",
      excerpt: excerptAround(normalised, line.index, line[0].length),
    });
  }

  // "08-1234-5678" and "081 234 5678" are the same number; compare on a copy
  // with the separators removed, or every detector is one hyphen from useless.
  const compact = normalised.replace(/[\s.\-()]/g, "");
  for (const run of compact.match(DIGIT_RUN_RE) ?? []) {
    // A leading zero at 9–10 digits is a Thai phone, not an account number.
    // Classifying it as a bank detail would send it to the wrong queue at the
    // wrong severity, so the more specific rule wins.
    if (run.startsWith("0") && run.length <= 10) {
      hits.push({
        reason: "off-platform-contact",
        detector: "phone",
        severity: "medium",
        excerpt: run,
      });
    } else if (run.length >= 10) {
      hits.push({
        reason: "bank-details",
        detector: "bank-account",
        severity: "high",
        excerpt: run,
      });
    }
  }

  if (hits.length === 0) return null;
  return hits.reduce((best, hit) =>
    SEVERITY_RANK[hit.severity] > SEVERITY_RANK[best.severity] ? hit : best,
  );
}

/** Enough surrounding text for a moderator to judge intent, never the whole message. */
function excerptAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - EXCERPT_RADIUS);
  return text.slice(start, index + length + EXCERPT_RADIUS).slice(0, EXCERPT_MAX_CHARS);
}

// ── Shared helpers ───────────────────────────────────────────────────────────

/**
 * The caller's own row of a thread, or null.
 *
 * Ownership is in the WHERE clause rather than a check on the fetched row: a
 * thread the caller is not part of therefore reads exactly like a thread that
 * does not exist, so probing ids tells an attacker nothing, and there is no
 * ordering of statements in which the data is read before the check.
 */
async function findParticipantThread(db: Db, threadId: string, userId: string) {
  const [thread] = await db
    .select({ id: schema.chatThread.id })
    .from(schema.chatThread)
    .where(
      and(
        eq(schema.chatThread.id, threadId),
        or(eq(schema.chatThread.advisorId, userId), eq(schema.chatThread.adviseeId, userId)),
      ),
    )
    .limit(1);
  return thread ?? null;
}

/** One line's worth. Newlines collapse because the preview is a single row. */
function toPreview(body: string | null): string {
  const flat = (body ?? "").replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_MAX_CHARS
    ? `${flat.slice(0, PREVIEW_MAX_CHARS - 1)}…`
    : flat;
}

interface MessageRow {
  readonly kind: string;
  readonly body: string | null;
  readonly uploadUrl: string | null;
  readonly uploadStatus: string | null;
  readonly uploadSizeBytes: number | null;
  readonly uploadKey: string | null;
}

/**
 * Map a stored row onto the `ChatMessageBody` union.
 *
 * Returns null when an attachment has nothing renderable — the upload never
 * completed, or moderation rejected it. The union has no "unavailable" member,
 * so such a row is dropped from the page instead: an invented URL would 404 in
 * the bubble, and inventing user-facing copy here would put Thai text in the
 * backend, which the frontend owns.
 */
function toBody(row: MessageRow): ChatMessageBody | null {
  if (row.kind === "file" || row.kind === "image") {
    // A rejected upload keeps its `publicUrl` column; status is what says
    // whether the bytes may be served.
    if (row.uploadStatus !== "complete" || !row.uploadUrl) return null;

    if (row.kind === "image") {
      return {
        kind: "image",
        url: row.uploadUrl,
        width: UNKNOWN_IMAGE_SIDE,
        height: UNKNOWN_IMAGE_SIDE,
      };
    }
    return {
      kind: "file",
      // `upload` has no filename column, so the sender's display name lives in
      // `body` for attachment rows; the R2 key's last segment is the fallback.
      fileName: row.body?.trim() || row.uploadKey?.split("/").pop() || "attachment",
      sizeBytes: row.uploadSizeBytes ?? 0,
      url: row.uploadUrl,
    };
  }
  return { kind: "text", text: row.body ?? "" };
}

/**
 * Opening a thread is the only signal the platform gets that its messages were
 * read — there is no separate "mark read" endpoint — so `chat.messages` clears
 * them. Fire-and-forget: the unread badge is not worth a round trip of latency
 * on the read path, and a lost update self-heals on the next open.
 */
function markThreadRead(ctx: WorkerContext, threadId: string, userId: string): void {
  ctx.waitUntil(
    ctx.db
      .update(schema.chatMessage)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(schema.chatMessage.threadId, threadId),
          ne(schema.chatMessage.senderId, userId),
          isNull(schema.chatMessage.readAt),
        ),
      )
      .catch((error: unknown) => {
        console.warn("failed to mark thread read", threadId, error);
      }),
  );
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export const messagingHandlers = {
  "chat.threads": h<"chat.threads">(async (_input, ctx) => {
    const me = ctx.requireUser().id;

    // The partner is whichever side of the thread the caller is not. Deciding
    // that in SQL means the user table is joined once for the whole inbox
    // instead of being looked up per row.
    const partnerId = sql`case when ${schema.chatThread.advisorId} = ${me} then ${schema.chatThread.adviseeId} else ${schema.chatThread.advisorId} end`;

    // A thread with no messages yet still belongs in the inbox, so it sorts by
    // when it was opened rather than dropping to the bottom on a null.
    const activeAt = sql`coalesce(${schema.chatThread.lastMessageAt}, ${schema.chatThread.createdAt})`;

    const rows = await ctx.db
      .select({
        id: schema.chatThread.id,
        partnerId: schema.user.id,
        partnerName: schema.user.name,
        partnerImageUrl: schema.user.image,
        lastMessageAt: schema.chatThread.lastMessageAt,
        createdAt: schema.chatThread.createdAt,
        // Correlated rather than a join + group by: the inbox needs the newest
        // body and a filtered count off the same table, and one grouped join
        // cannot produce both without a second pass.
        preview: sql<string | null>`(
          select m.body from ${schema.chatMessage} m
          where m.thread_id = ${schema.chatThread.id}
          order by m.sent_at desc
          limit 1
        )`,
        // ::int because count() is bigint, which the driver would hand back as
        // a string and the contract types as a number.
        unreadCount: sql<number>`(
          select count(*)::int from ${schema.chatMessage} m
          where m.thread_id = ${schema.chatThread.id}
            and m.sender_id <> ${me}
            and m.read_at is null
        )`,
      })
      .from(schema.chatThread)
      .innerJoin(schema.user, eq(schema.user.id, partnerId))
      .where(or(eq(schema.chatThread.advisorId, me), eq(schema.chatThread.adviseeId, me)))
      .orderBy(desc(activeAt))
      .limit(INBOX_LIMIT);

    return rows.map((row) => ({
      id: row.id,
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      partnerImageUrl: row.partnerImageUrl,
      preview: toPreview(row.preview),
      lastAt: (row.lastMessageAt ?? row.createdAt).toISOString(),
      unreadCount: row.unreadCount,
    }));
  }),

  "chat.messages": h<"chat.messages">(async (input, ctx) => {
    const me = ctx.requireUser().id;

    // Before anything is read: a non-participant gets the same answer as
    // someone asking for a thread id that was never issued.
    const thread = await findParticipantThread(ctx.db, input.threadId, me);
    if (!thread) throw apiError("NOT_FOUND", "No such thread");

    // The cursor is our own `sentAt` echoed back, but it arrives from the
    // network like everything else, and a NaN date would reach Postgres.
    let before: Date | null = null;
    if (input.cursor) {
      before = new Date(input.cursor);
      if (Number.isNaN(before.getTime())) {
        throw apiError("VALIDATION_FAILED", "Cursor is not an ISO timestamp", {
          cursor: "invalid",
        });
      }
    }

    // Paged newest-first and reversed below. A chat opens at the *latest*
    // message, so page one has to be the tail of the thread — walking forward
    // from the first message ever would make a long thread unreadable — while
    // the contract still hands each page back oldest-first for rendering.
    const rows = await ctx.db
      .select({
        id: schema.chatMessage.id,
        threadId: schema.chatMessage.threadId,
        senderId: schema.chatMessage.senderId,
        kind: schema.chatMessage.kind,
        body: schema.chatMessage.body,
        sentAt: schema.chatMessage.sentAt,
        uploadUrl: schema.upload.publicUrl,
        uploadStatus: schema.upload.status,
        uploadSizeBytes: schema.upload.sizeBytes,
        uploadKey: schema.upload.r2Key,
      })
      .from(schema.chatMessage)
      // Left join, one statement: attachments must not cost a lookup per
      // message, and a text message has no upload row to find.
      .leftJoin(schema.upload, eq(schema.upload.id, schema.chatMessage.uploadId))
      .where(
        and(
          eq(schema.chatMessage.threadId, input.threadId),
          before ? lt(schema.chatMessage.sentAt, before) : undefined,
        ),
      )
      // Secondary sort on id keeps the order total: two messages can share a
      // millisecond, and an unstable order would let a page boundary drop one.
      .orderBy(desc(schema.chatMessage.sentAt), desc(schema.chatMessage.id))
      .limit(input.limit + 1);

    // One row over the limit is the cheapest way to know whether more exist.
    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;
    // Computed before unrenderable rows are dropped, so paging still steps past
    // them instead of asking for the same window forever.
    const nextCursor = hasMore ? (page.at(-1)?.sentAt.toISOString() ?? null) : null;

    const items: ChatMessage[] = [];
    // Reversed: the page was fetched newest-first, the contract renders it
    // oldest-first.
    for (const row of page.reverse()) {
      const body = toBody(row);
      if (!body) continue;
      items.push({
        id: row.id,
        threadId: row.threadId,
        mine: row.senderId === me,
        body,
        sentAt: row.sentAt.toISOString(),
        // "sending" and "failed" are optimistic client states; anything the
        // server can see is, by definition, sent.
        status: "sent",
      });
    }

    markThreadRead(ctx, input.threadId, me);

    return { items, nextCursor };
  }),

  "chat.send": h<"chat.send">(async (input, ctx) => {
    const me = ctx.requireUser().id;

    const thread = await findParticipantThread(ctx.db, input.threadId, me);
    if (!thread) throw apiError("NOT_FOUND", "No such thread");

    const sentAt = new Date();

    // `db.batch` because neon-http has no interactive transactions and these two
    // must not come apart: a message stored without its thread's `lastMessageAt`
    // bumped would sit at the bottom of both inboxes and read as never sent.
    const [inserted] = await ctx.db.batch([
      ctx.db
        .insert(schema.chatMessage)
        .values({
          threadId: input.threadId,
          senderId: me,
          kind: "text",
          body: input.text,
          clientToken: input.clientToken,
          sentAt,
        })
        // The unique index on (threadId, clientToken) is what makes a retry
        // idempotent. Do nothing on conflict and re-read below, rather than
        // update: a retry must not be able to rewrite the text of a message the
        // other side may already have read.
        .onConflictDoNothing({
          target: [schema.chatMessage.threadId, schema.chatMessage.clientToken],
        })
        .returning({ id: schema.chatMessage.id, sentAt: schema.chatMessage.sentAt }),
      ctx.db
        .update(schema.chatThread)
        .set({ lastMessageAt: sentAt })
        .where(eq(schema.chatThread.id, input.threadId)),
    ]);

    const row = inserted[0];
    if (!row) {
      // Conflict: this token already posted. Return that message so the retry
      // that could not read our first reply still ends up with the real id.
      const [existing] = await ctx.db
        .select({
          id: schema.chatMessage.id,
          body: schema.chatMessage.body,
          sentAt: schema.chatMessage.sentAt,
        })
        .from(schema.chatMessage)
        .where(
          and(
            eq(schema.chatMessage.threadId, input.threadId),
            eq(schema.chatMessage.clientToken, input.clientToken),
            // Tokens are client-generated, so the other participant could pick
            // the same one. Scoping the re-read to the caller stops a replay
            // from handing them somebody else's message marked `mine`.
            eq(schema.chatMessage.senderId, me),
          ),
        )
        .limit(1);

      if (!existing) {
        throw apiError("CONFLICT", "clientToken already used in this thread");
      }

      return {
        id: existing.id,
        threadId: input.threadId,
        mine: true,
        body: { kind: "text", text: existing.body ?? input.text },
        sentAt: existing.sentAt.toISOString(),
        status: "sent",
      };
    }

    // Only on a genuine insert — flagging again on every retry would multiply
    // one offence into a queue of duplicates for the moderator.
    const hit = detectOffPlatformContact(input.text);
    if (hit) {
      // After the reply is composed, never before it: moderation is a
      // background concern and must not add latency to sending a message.
      ctx.waitUntil(
        ctx.db
          .insert(schema.policyFlag)
          .values({
            userId: me,
            messageId: row.id,
            reason: hit.reason,
            detector: hit.detector,
            severity: hit.severity,
            excerpt: hit.excerpt,
          })
          .catch((error: unknown) => {
            // The message is already sent; a failed flag is a moderation gap to
            // log, not an error to show the sender.
            console.warn("failed to record policy flag", row.id, error);
          }),
      );
    }

    return {
      id: row.id,
      threadId: input.threadId,
      mine: true,
      body: { kind: "text", text: input.text },
      sentAt: row.sentAt.toISOString(),
      status: "sent",
    };
  }),

  "notifications.list": h<"notifications.list">(async (_input, ctx) => {
    const me = ctx.requireUser().id;

    const rows = await ctx.db
      .select({
        id: schema.notification.id,
        kind: schema.notification.kind,
        title: schema.notification.title,
        body: schema.notification.body,
        href: schema.notification.href,
        readAt: schema.notification.readAt,
        createdAt: schema.notification.createdAt,
      })
      .from(schema.notification)
      .where(eq(schema.notification.userId, me))
      .orderBy(desc(schema.notification.createdAt))
      .limit(NOTIFICATION_LIMIT);

    return rows.map((row) => ({
      id: row.id,
      // `kind` is text in the database so adding one is not a migration; an
      // unrecognised value degrades to the neutral glyph rather than breaking
      // the whole list on the client's enum parse.
      kind: toNotificationKind(row.kind),
      title: row.title,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      // Relative paths only. A row that somehow holds an absolute URL is
      // dropped to null so a notification can never bounce a user off-site.
      href: row.href?.startsWith("/") ? row.href : null,
    }));
  }),

  "notifications.markAllRead": h<"notifications.markAllRead">(async (_input, ctx) => {
    const me = ctx.requireUser().id;

    // Restricted to still-unread rows so re-tapping the bell does not rewrite
    // the timestamps that say when the user actually saw each one.
    await ctx.db
      .update(schema.notification)
      .set({ readAt: new Date() })
      .where(and(eq(schema.notification.userId, me), isNull(schema.notification.readAt)));

    return { ok: true } as const;
  }),
} satisfies Pick<
  Handlers,
  | "chat.threads"
  | "chat.messages"
  | "chat.send"
  | "notifications.list"
  | "notifications.markAllRead"
>;

const NOTIFICATION_KINDS: readonly Notification["kind"][] = [
  "message",
  "booking",
  "payment",
  "system",
];

function toNotificationKind(value: string): Notification["kind"] {
  return NOTIFICATION_KINDS.includes(value as Notification["kind"])
    ? (value as Notification["kind"])
    : "system";
}
