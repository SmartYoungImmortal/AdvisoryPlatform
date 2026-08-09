import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

const id = () => text("id").primaryKey().default(sql`gen_random_uuid()::text`);

/** Public advisor profile. One row per advisor; `userId` is both PK and FK. */
export const advisorProfile = pgTable(
  "advisor_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    /** One-line specialism, e.g. "โปรเจกต์จบและระเบียบวิธีวิจัย". */
    headline: text("headline").notNull().default(""),
    bio: text("bio").notNull().default(""),
    /** Set when admin approves the verification. Gates discoverability. */
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    acceptingRequests: boolean("accepting_requests").default(true).notNull(),
    /**
     * Denormalised review aggregates. Recomputed on every review write rather
     * than joined at read time — the advisor list renders a rating on every
     * card, and an aggregate per card is the classic N+1 that blows the Free
     * plan's 50-subrequest ceiling.
     */
    ratingSum: integer("rating_sum").default(0).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    sessionCount: integer("session_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("advisor_profile_verified_idx").on(t.verifiedAt, t.acceptingRequests)],
);

export const advisorSkill = pgTable(
  "advisor_skill",
  {
    id: id(),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").default(0).notNull(),
  },
  (t) => [
    index("advisor_skill_advisor_idx").on(t.advisorId, t.position),
    // Powers "search by skill" without a separate tag table.
    index("advisor_skill_name_idx").on(t.name),
  ],
);

export const advisorCertificate = pgTable(
  "advisor_certificate",
  {
    id: id(),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    issuer: text("issuer"),
    /** FK to `upload`; declared loosely to avoid a cycle across schema files. */
    uploadId: text("upload_id"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("advisor_certificate_advisor_idx").on(t.advisorId)],
);

/**
 * The three-stage onboarding application. One in-flight row per user; history
 * is kept by inserting a new row after a rejection so the reviewer trail
 * survives a resubmission.
 */
export const advisorApplication = pgTable(
  "advisor_application",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** draft | submitted | pending | more-info-needed | approved | rejected */
    status: text("status").notNull().default("draft"),
    stage: integer("stage").default(1).notNull(),
    legalName: text("legal_name"),
    phone: text("phone"),
    birthDate: text("birth_date"),
    bio: text("bio"),
    /** Stage 2: national ID scan. FK to `upload`. */
    idDocumentUploadId: text("id_document_upload_id"),
    /** Stage 3: proof of expertise. FK to `upload`. */
    skillProofUploadId: text("skill_proof_upload_id"),
    reviewerNote: text("reviewer_note"),
    reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("advisor_application_user_idx").on(t.userId),
    // The admin queue: everything waiting on a human, oldest first.
    index("advisor_application_status_idx").on(t.status, t.submittedAt),
  ],
);

/**
 * A consult offering. An advisor may publish several — "ปรึกษาโปรเจกต์จบ 60
 * นาที" and "ตรวจวิทยานิพนธ์ 45 นาที" are two services, and a booking is
 * always *of a service*, which is what makes the price and duration on an old
 * invoice stay correct after the advisor changes their rates.
 */
export const service = pgTable(
  "service",
  {
    id: id(),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** Satang. Integer — see lib/api/schema/common.ts. */
    priceMinor: integer("price_minor").notNull(),
    currency: text("currency").notNull().default("THB"),
    durationMinutes: integer("duration_minutes").notNull(),
    /** draft | published | unpublished */
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("service_advisor_idx").on(t.advisorId, t.status),
    index("service_status_price_idx").on(t.status, t.priceMinor),
  ],
);

/**
 * A bookable window. "No-overlap" is a core requirement, and it is enforced by
 * a Postgres EXCLUDE constraint added in the migration — not in application
 * code. Two advisees hitting checkout in the same second is exactly the race
 * the `/checkout/slot-taken` screen exists for, and only the database can
 * settle it.
 *
 *   ALTER TABLE timeslot ADD CONSTRAINT timeslot_no_overlap
 *     EXCLUDE USING gist (
 *       advisor_id WITH =,
 *       tstzrange(start_at, end_at, '[)') WITH &&
 *     ) WHERE (status <> 'cancelled');
 */
export const timeslot = pgTable(
  "timeslot",
  {
    id: id(),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "cascade" }),
    /** Optional: restrict this slot to one service. Null means any. */
    serviceId: text("service_id").references(() => service.id, { onDelete: "set null" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    /** open | held | booked | cancelled */
    status: text("status").notNull().default("open"),
    /**
     * Set while an advisee is in checkout. A held slot is invisible to others
     * until it expires, which stops two people paying for the same hour.
     */
    heldUntil: timestamp("held_until", { withTimezone: true }),
    heldBy: text("held_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("timeslot_advisor_start_idx").on(t.advisorId, t.startAt),
    index("timeslot_open_idx").on(t.status, t.startAt),
  ],
);
