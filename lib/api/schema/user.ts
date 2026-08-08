import { z } from "zod";

import { Id, IsoDateTime, Role } from "./common";

/**
 * The signed-in person. Backed by better-auth's `user` table plus a `role`
 * column added through `user.additionalFields`.
 */
export const User = z.object({
  id: Id,
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  /** Absolute URL. Null until the user uploads one — the UI falls back to a placeholder. */
  imageUrl: z.url().nullable(),
  role: Role,
  createdAt: IsoDateTime,
});

/**
 * What `session.get` returns. Null means signed out — that is not an error, so
 * the endpoint answers 200 with `null`, never 401.
 */
export const Session = z.object({
  user: User,
  expiresAt: IsoDateTime,
});

/**
 * The three counters on the advisee profile card (`components/profile/identity-card.tsx`,
 * currently the literals "12" / "1" / "8").
 */
export const AdviseeStats = z.object({
  consultations: z.int(),
  bookings: z.int(),
  reviews: z.int(),
});

/** `/profile` — the identity card plus its counters. */
export const AdviseeProfile = z.object({
  user: User,
  /** e.g. "ผู้รับคำปรึกษา" — the line under the name. */
  subtitle: z.string(),
  stats: AdviseeStats,
});

/** `/profile/edit`. `imageUrl` is set by a separate upload endpoint, not here. */
export const UpdateProfileInput = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(20).nullish(),
  birthDate: z.iso.date().nullish(),
  bio: z.string().max(500).nullish(),
});

export type User = z.infer<typeof User>;
export type Session = z.infer<typeof Session>;
export type AdviseeStats = z.infer<typeof AdviseeStats>;
export type AdviseeProfile = z.infer<typeof AdviseeProfile>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;
