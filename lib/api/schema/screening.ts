import { z } from "zod";

import { Id, IsoDateTime } from "./common";

/**
 * A question an advisor asks before accepting a request — the list on
 * `/screening/setup`. `required` renders as "จำเป็น" vs "ไม่บังคับ".
 */
export const ScreeningQuestion = z.object({
  id: Id,
  prompt: z.string().min(1).max(300),
  required: z.boolean(),
  /** Display order, ascending. */
  position: z.int(),
});

export const ScreeningAnswer = z.object({
  questionId: Id,
  prompt: z.string(),
  answer: z.string(),
});

export const ScreeningStatus = z.enum([
  "pending",
  "accepted",
  "declined",
]);

/**
 * One advisee's submission. The advisor sees it on `/screening/requests`
 * (list) and `/screening/review` (detail); the advisee sees its status on
 * `/screening/submitted`, `/accepted`, `/declined`.
 */
export const ScreeningRequest = z.object({
  id: Id,
  advisorId: Id,
  adviseeId: Id,
  adviseeName: z.string(),
  /** e.g. "โปรเจกต์จบ · ระเบียบวิธีวิจัย" — topic summary shown in the list. */
  topicLabel: z.string(),
  status: ScreeningStatus,
  answers: z.array(ScreeningAnswer),
  createdAt: IsoDateTime,
  respondedAt: IsoDateTime.nullable(),
  /** The advisor's message when declining — shown on `/screening/declined`. */
  responseNote: z.string().nullable(),
  /** True until the advisor opens it; drives the unread dot. */
  unread: z.boolean(),
});

export const SubmitScreeningInput = z.object({
  advisorId: Id,
  answers: z.array(
    z.object({ questionId: Id, answer: z.string().max(2000) }),
  ),
});

export const RespondToScreeningInput = z.object({
  requestId: Id,
  decision: z.enum(["accept", "decline"]),
  note: z.string().max(1000).nullish(),
});

export const SaveScreeningQuestionsInput = z.object({
  questions: z.array(
    z.object({
      id: Id.nullish(),
      prompt: z.string().min(1).max(300),
      required: z.boolean(),
    }),
  ),
});

export type ScreeningQuestion = z.infer<typeof ScreeningQuestion>;
export type ScreeningAnswer = z.infer<typeof ScreeningAnswer>;
export type ScreeningStatus = z.infer<typeof ScreeningStatus>;
export type ScreeningRequest = z.infer<typeof ScreeningRequest>;
export type SubmitScreeningInput = z.infer<typeof SubmitScreeningInput>;
export type RespondToScreeningInput = z.infer<typeof RespondToScreeningInput>;
export type SaveScreeningQuestionsInput = z.infer<typeof SaveScreeningQuestionsInput>;
