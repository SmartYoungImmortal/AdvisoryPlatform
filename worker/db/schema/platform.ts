import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { advisorProfile } from "./advisor";
import { booking } from "./commerce";

const id = () => text("id").primaryKey().default(sql`gen_random_uuid()::text`);

/**
 * A file in R2. Bytes never pass through the Worker — `uploads.create` returns
 * a presigned PUT and the browser uploads directly, because streaming a 50MB
 * ID scan through a 10ms CPU budget is not survivable.
 */
export const upload = pgTable(
  "upload",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** profile-photo | identity-document | credential-document | chat-attachment */
    purpose: text("purpose").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    r2Key: text("r2_key").notNull().unique(),
    publicUrl: text("public_url"),
    /**
     * pending | complete | rejected — `pending` until the browser's PUT is
     * confirmed. An upload id must never be attachable before that, or a user
     * could reference a file they never actually sent.
     */
    status: text("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("upload_user_idx").on(t.userId, t.createdAt)],
);

export const chatThread = pgTable(
  "chat_thread",
  {
    id: id(),
    /** Null for pre-booking enquiries. */
    bookingId: text("booking_id").references(() => booking.id, { onDelete: "set null" }),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    adviseeId: text("advisee_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // The inbox query, for either side.
    index("chat_thread_advisor_idx").on(t.advisorId, t.lastMessageAt),
    index("chat_thread_advisee_idx").on(t.adviseeId, t.lastMessageAt),
    // One enquiry thread per pair; booking threads are separate rows.
    uniqueIndex("chat_thread_pair_uidx").on(t.advisorId, t.adviseeId, t.bookingId),
  ],
);

export const chatMessage = pgTable(
  "chat_message",
  {
    id: id(),
    threadId: text("thread_id")
      .notNull()
      .references(() => chatThread.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** text | file | image */
    kind: text("kind").notNull().default("text"),
    body: text("body"),
    uploadId: text("upload_id").references(() => upload.id, { onDelete: "set null" }),
    /**
     * Client-generated. The unique index is what makes a retry after a failed
     * send idempotent instead of double-posting — the `/chat/…/message-failed`
     * screen exists precisely because retries happen.
     */
    clientToken: text("client_token"),
    readAt: timestamp("read_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("chat_message_thread_idx").on(t.threadId, t.sentAt),
    uniqueIndex("chat_message_client_token_uidx").on(t.threadId, t.clientToken),
  ],
);

export const notification = pgTable(
  "notification",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** message | booking | payment | system */
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Relative in-app path. Never absolute — it must not bounce a user off-site. */
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("notification_user_idx").on(t.userId, t.createdAt),
    index("notification_unread_idx").on(t.userId, t.readAt),
  ],
);

export const review = pgTable(
  "review",
  {
    id: id(),
    /** One review per booking — the unique index is the ALREADY_REVIEWED guard. */
    bookingId: text("booking_id")
      .notNull()
      .references(() => booking.id, { onDelete: "cascade" }),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** 1–5, whole stars. The designs have no half states. */
    rating: integer("rating").notNull(),
    body: text("body").notNull().default(""),
    replyBody: text("reply_body"),
    replyAt: timestamp("reply_at", { withTimezone: true }),
    /** Hidden by an admin after a report, without deleting the evidence. */
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("review_booking_uidx").on(t.bookingId),
    index("review_advisor_idx").on(t.advisorId, t.createdAt),
  ],
);

/**
 * Off-platform detection. Messages are scanned for attempts to move the deal
 * off the platform (phone numbers, LINE ids, bank accounts). A hit records a
 * flag rather than blocking — false positives on a legitimate consult would be
 * worse than the leakage, so a human decides.
 */
export const policyFlag = pgTable(
  "policy_flag",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    messageId: text("message_id").references(() => chatMessage.id, { onDelete: "cascade" }),
    /** off-platform-contact | bank-details | abusive | spam */
    reason: text("reason").notNull(),
    /** Which detector fired, for tuning. */
    detector: text("detector").notNull(),
    /** low | medium | high */
    severity: text("severity").notNull().default("low"),
    excerpt: text("excerpt"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("policy_flag_user_idx").on(t.userId, t.createdAt),
    index("policy_flag_open_idx").on(t.resolvedAt, t.severity),
  ],
);

/** A user-submitted report. Separate from `policyFlag`, which is automated. */
export const report = pgTable(
  "report",
  {
    id: id(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** user | message | review | booking */
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    detail: text("detail"),
    /** open | reviewing | actioned | dismissed */
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("report_status_idx").on(t.status, t.createdAt)],
);

/**
 * Every privileged action, append-only. An admin console without this is a
 * console nobody can audit — and suspending users is exactly the power that
 * needs a trail.
 */
export const adminAction = pgTable(
  "admin_action",
  {
    id: id(),
    adminId: text("admin_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("admin_action_admin_idx").on(t.adminId, t.createdAt),
    index("admin_action_target_idx").on(t.targetType, t.targetId),
  ],
);

// ── Deferred features (P3) — schema present so the Figma screens have somewhere
// to read from, but no business logic depends on them yet. ───────────────────

export const screeningQuestion = pgTable(
  "screening_question",
  {
    id: id(),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    required: boolean("required").default(true).notNull(),
    position: integer("position").default(0).notNull(),
  },
  (t) => [index("screening_question_advisor_idx").on(t.advisorId, t.position)],
);

export const screeningRequest = pgTable(
  "screening_request",
  {
    id: id(),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "cascade" }),
    adviseeId: text("advisee_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicLabel: text("topic_label").notNull().default(""),
    /** pending | accepted | declined */
    status: text("status").notNull().default("pending"),
    responseNote: text("response_note"),
    unread: boolean("unread").default(true).notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("screening_request_advisor_idx").on(t.advisorId, t.status, t.createdAt),
    index("screening_request_advisee_idx").on(t.adviseeId, t.createdAt),
  ],
);

export const screeningAnswer = pgTable(
  "screening_answer",
  {
    id: id(),
    requestId: text("request_id")
      .notNull()
      .references(() => screeningRequest.id, { onDelete: "cascade" }),
    questionId: text("question_id").references(() => screeningQuestion.id, {
      onDelete: "set null",
    }),
    /** Snapshot — the advisor may edit their questions after answers arrive. */
    prompt: text("prompt").notNull(),
    answer: text("answer").notNull(),
    position: integer("position").default(0).notNull(),
  },
  (t) => [index("screening_answer_request_idx").on(t.requestId, t.position)],
);

export const matchRun = pgTable(
  "match_run",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    budgetMaxPerHourMinor: integer("budget_max_per_hour_minor"),
    detail: text("detail").notNull(),
    /** searching | done */
    status: text("status").notNull().default("searching"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("match_run_user_idx").on(t.userId, t.createdAt)],
);

export const matchResult = pgTable(
  "match_result",
  {
    id: id(),
    runId: text("run_id")
      .notNull()
      .references(() => matchRun.id, { onDelete: "cascade" }),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "cascade" }),
    matchedOn: text("matched_on").notNull().default(""),
    /** 0–1, stored as basis points so the column stays an integer. */
    scoreBp: integer("score_bp").notNull().default(0),
    position: integer("position").default(0).notNull(),
  },
  (t) => [index("match_result_run_idx").on(t.runId, t.position)],
);
