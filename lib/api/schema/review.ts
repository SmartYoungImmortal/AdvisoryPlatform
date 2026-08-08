import { z } from "zod";

import { Id, IsoDateTime } from "./common";

/** Whole stars only — the Figma star row has no half states. */
export const Rating = z.int().min(1).max(5);

/** A card in `components/reviews/review-parts.tsx`. */
export const Review = z.object({
  id: Id,
  authorName: z.string(),
  authorImageUrl: z.url().nullable(),
  /** e.g. "ปรึกษาโปรเจกต์จบ · 60 นาที" — the session this review is about. */
  sessionLabel: z.string(),
  rating: Rating,
  body: z.string(),
  createdAt: IsoDateTime,
  /** The advisor's public reply. Null when they haven't replied yet. */
  reply: z
    .object({ body: z.string(), createdAt: IsoDateTime })
    .nullable(),
});

/**
 * The header on `/reviews`: the big average, the count, and the five
 * distribution bars (currently hardcoded as `fill={38|5|2|1|1}`).
 */
export const ReviewSummary = z.object({
  average: z.number().min(0).max(5),
  total: z.int(),
  /** Counts per star, keyed 1–5. The UI computes bar widths from these. */
  distribution: z.object({
    1: z.int(),
    2: z.int(),
    3: z.int(),
    4: z.int(),
    5: z.int(),
  }),
});

export const SubmitReviewInput = z.object({
  bookingId: Id,
  rating: Rating,
  body: z.string().max(2000),
});

export const ReplyToReviewInput = z.object({
  reviewId: Id,
  body: z.string().min(1).max(2000),
});

export type Rating = z.infer<typeof Rating>;
export type Review = z.infer<typeof Review>;
export type ReviewSummary = z.infer<typeof ReviewSummary>;
export type SubmitReviewInput = z.infer<typeof SubmitReviewInput>;
export type ReplyToReviewInput = z.infer<typeof ReplyToReviewInput>;
