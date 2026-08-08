import { z } from "zod";

import { Id, IsoDateTime, Money } from "./common";

/** A tag on the advisor profile — `components/advisor/advisor-profile-screens.tsx`. */
export const Skill = z.object({
  id: Id,
  name: z.string(),
  /** e.g. "ปรึกษา 24 ครั้ง" — the muted line under the skill name. */
  meta: z.string(),
});

/** The three-up figure block on the advisor profile: rating, sessions, reviews. */
export const AdvisorStats = z.object({
  /** 0–5, one decimal. Sent as a number so the UI controls the rendering. */
  rating: z.number().min(0).max(5),
  sessions: z.int(),
  reviews: z.int(),
});

export const Advisor = z.object({
  id: Id,
  name: z.string(),
  imageUrl: z.url().nullable(),
  /** Specialism line, e.g. "โปรเจกต์จบและระเบียบวิธีวิจัย". */
  field: z.string(),
  bio: z.string(),
  hourlyRate: Money,
  stats: AdvisorStats,
  skills: z.array(Skill),
  /** Whether the advisor is currently taking new advisees. */
  acceptingRequests: z.boolean(),
});

// ─── Onboarding ──────────────────────────────────────────────────────────────

/**
 * The three-stage advisor application. `stage` is 1-based to match the
 * "ขั้นตอนที่ n จาก 3" caption in `components/onboarding/parts.tsx`.
 */
export const ApplicationStatus = z.enum([
  "draft",
  "submitted",
  "pending",
  "more-info-needed",
  "approved",
  "rejected",
]);

export const AdvisorApplication = z.object({
  id: Id,
  status: ApplicationStatus,
  stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  submittedAt: IsoDateTime.nullable(),
  /** Shown on "Verification Failed" / "More info needed". Null otherwise. */
  reviewerNote: z.string().nullable(),
});

export const ApplicationStage1Input = z.object({
  legalName: z.string().min(1).max(120),
  phone: z.string().min(1).max(20),
  birthDate: z.iso.date(),
  bio: z.string().max(500),
});

/** Stage 2 and 3 upload documents; the file itself goes through `uploads.create`. */
export const ApplicationDocumentInput = z.object({
  stage: z.union([z.literal(2), z.literal(3)]),
  uploadId: Id,
});

// ─── Earnings and payouts ────────────────────────────────────────────────────

export const PayoutStatus = z.enum(["scheduled", "processing", "paid", "failed"]);

export const Payout = z.object({
  id: Id,
  amount: Money,
  status: PayoutStatus,
  /** When it settled, or is expected to. */
  date: IsoDateTime,
  /** Populated only when `status` is "failed" — drives the failure screen. */
  failureReason: z.string().nullable(),
});

export const PayoutAccount = z.object({
  bankName: z.string(),
  /** Last 4 digits only. The backend must never send the full number. */
  accountLast4: z.string().length(4),
  accountName: z.string(),
  verified: z.boolean(),
});

export const PayoutAccountInput = z.object({
  bankName: z.string().min(1),
  accountNumber: z.string().min(6).max(20),
  accountName: z.string().min(1),
});

/** `/earnings` — the balance card plus its breakdown rows. */
export const Earnings = z.object({
  available: Money,
  pending: Money,
  /** Settled total for the current month. */
  monthToDate: Money,
  breakdown: z.array(
    z.object({
      label: z.string(),
      amount: Money,
    }),
  ),
});

export type Skill = z.infer<typeof Skill>;
export type AdvisorStats = z.infer<typeof AdvisorStats>;
export type Advisor = z.infer<typeof Advisor>;
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;
export type AdvisorApplication = z.infer<typeof AdvisorApplication>;
export type ApplicationStage1Input = z.infer<typeof ApplicationStage1Input>;
export type ApplicationDocumentInput = z.infer<typeof ApplicationDocumentInput>;
export type PayoutStatus = z.infer<typeof PayoutStatus>;
export type Payout = z.infer<typeof Payout>;
export type PayoutAccount = z.infer<typeof PayoutAccount>;
export type PayoutAccountInput = z.infer<typeof PayoutAccountInput>;
export type Earnings = z.infer<typeof Earnings>;
