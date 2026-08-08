import { z } from "zod";

import { Advisor } from "./advisor";
import { Id, Money } from "./common";

/** What `/matching` collects before searching. */
export const MatchQuery = z.object({
  /** The "หัวข้อ" field. */
  topic: z.string().min(1).max(120),
  /** Per-hour ceiling the advisee is willing to pay. Null means no limit. */
  budgetMaxPerHour: Money.nullish(),
  /** The free-text "รายละเอียดปัญหา" box — the more detail, the better the match. */
  detail: z.string().min(1).max(2000),
});

/**
 * A card on `/matching/results`. Carries the advisor plus *why* they matched,
 * which is the "ตรงกับ …" line — that reason is computed per query, so it
 * cannot live on `Advisor` itself.
 */
export const AdvisorMatch = z.object({
  advisor: Advisor,
  /** e.g. "ระเบียบวิธีวิจัย" — what in the query this advisor matched on. */
  matchedOn: z.string(),
  /** 0–1. Ranking only; not shown to the user today. */
  score: z.number().min(0).max(1),
});

/** A search is persisted so `/matching/searching` can be resumed or polled. */
export const MatchRun = z.object({
  id: Id,
  status: z.enum(["searching", "done"]),
  results: z.array(AdvisorMatch),
});

export type MatchQuery = z.infer<typeof MatchQuery>;
export type AdvisorMatch = z.infer<typeof AdvisorMatch>;
export type MatchRun = z.infer<typeof MatchRun>;
