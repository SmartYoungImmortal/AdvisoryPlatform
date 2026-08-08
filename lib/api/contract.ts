import { z } from "zod";

import * as S from "./schema";

/**
 * # The API contract
 *
 * One object describes every endpoint. Three things consume it:
 *
 * - `lib/api/client.ts` — `call("chat.send", …)` infers argument and result
 * - `lib/api/mock/handlers.ts` — the fake backend the UI runs against today
 * - `worker/router.ts` — the real backend
 *
 * The last two are both typed `satisfies Handlers`, so **a missing endpoint or a
 * wrong return shape is a compile error, not a runtime surprise.** That is the
 * whole point: the backend never has to guess what the frontend expects, and
 * cannot silently drift from it.
 *
 * ## Adding an endpoint
 *
 * Add a key here. TypeScript then fails in the mock and in the Worker until
 * both implement it. Never add a route to the Worker that isn't in this file —
 * the client has no way to call it.
 *
 * ## Conventions
 *
 * - `:param` segments in `path` MUST exist as fields on `input`. Enforced by
 *   `assertContractIntegrity()`, which the OpenAPI script runs.
 * - GET/DELETE: non-param input fields become the query string.
 *   POST/PATCH: they become the JSON body.
 * - `auth` is enforced **by the server**. See `docs/API.md` — the client-side
 *   role guard is a redirect for UX, worth nothing as a security control.
 */

export type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** Who may call an endpoint. The Worker enforces this before the handler runs. */
export type AuthLevel = "public" | "user" | "advisor";

export interface Endpoint<
  I extends z.ZodType = z.ZodType,
  O extends z.ZodType = z.ZodType,
> {
  readonly method: Method;
  readonly path: string;
  readonly input: I;
  readonly output: O;
  readonly auth: AuthLevel;
  readonly summary: string;
}

function ep<I extends z.ZodType, O extends z.ZodType>(
  method: Method,
  path: string,
  input: I,
  output: O,
  auth: AuthLevel,
  summary: string,
): Endpoint<I, O> {
  return { method, path, input, output, auth, summary };
}

/** No request payload. Reads better at the call sites than `z.void()`. */
const none = z.void();

export const contract = {
  // ── Session ────────────────────────────────────────────────────────────────
  // Sign-in/sign-up/sign-out are served by better-auth itself under
  // /api/auth/*, so they are deliberately absent here.
  "session.get": ep(
    "GET", "/api/session", none, S.Session.nullable(), "public",
    "Current session, or null when signed out. Signed out is 200 + null, never 401.",
  ),

  // ── Advisee profile and account ────────────────────────────────────────────
  "profile.get": ep(
    "GET", "/api/profile", none, S.AdviseeProfile, "user",
    "The signed-in advisee's identity card and its three counters.",
  ),
  "profile.update": ep(
    "PATCH", "/api/profile", S.UpdateProfileInput, S.User, "user",
    "Save the edit-profile form.",
  ),
  "profile.setPhoto": ep(
    "POST", "/api/profile/photo", z.object({ uploadId: S.Id }), S.User, "user",
    "Attach a completed upload as the profile photo. UPLOAD_REJECTED if it failed moderation.",
  ),
  "account.changePassword": ep(
    "POST", "/api/account/password",
    z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }),
    z.object({ ok: z.literal(true) }), "user",
    "INVALID_CREDENTIALS when the current password is wrong — drives /settings/password/wrong.",
  ),
  "account.delete": ep(
    "DELETE", "/api/account",
    z.object({ confirmText: z.string() }), z.object({ ok: z.literal(true) }), "user",
    "DELETION_BLOCKED when a balance or an open booking exists — drives /settings/delete/blocked.",
  ),

  // ── Chat ───────────────────────────────────────────────────────────────────
  "chat.threads": ep(
    "GET", "/api/chat/threads", none, z.array(S.ChatThread), "user",
    "Inbox rows, newest activity first.",
  ),
  "chat.messages": ep(
    "GET", "/api/chat/threads/:threadId/messages",
    S.PageQuery.extend({ threadId: S.Id }), S.Paginated(S.ChatMessage), "user",
    "One thread's messages, oldest first within a page.",
  ),
  "chat.send": ep(
    "POST", "/api/chat/threads/:threadId/messages",
    S.SendMessageInput, S.ChatMessage, "user",
    "Send a text message. Idempotent on clientToken so a retry cannot double-post.",
  ),

  // ── Notifications ──────────────────────────────────────────────────────────
  "notifications.list": ep(
    "GET", "/api/notifications", none, z.array(S.Notification), "user",
    "Newest first. The UI groups them into today/yesterday itself.",
  ),
  "notifications.markAllRead": ep(
    "POST", "/api/notifications/read", none, z.object({ ok: z.literal(true) }), "user",
    "Clear every unread dot.",
  ),

  // ── Matching ───────────────────────────────────────────────────────────────
  "matching.start": ep(
    "POST", "/api/matching", S.MatchQuery, S.MatchRun, "user",
    "Begin a search. May return status 'searching' — poll matching.get.",
  ),
  "matching.get": ep(
    "GET", "/api/matching/:runId", z.object({ runId: S.Id }), S.MatchRun, "user",
    "Poll a run. Empty results with status 'done' is /matching/results/no-results.",
  ),

  // ── Advisors ───────────────────────────────────────────────────────────────
  "advisors.get": ep(
    "GET", "/api/advisors/:advisorId", z.object({ advisorId: S.Id }), S.Advisor, "public",
    "Public advisor profile.",
  ),
  "advisors.slots": ep(
    "GET", "/api/advisors/:advisorId/slots", z.object({ advisorId: S.Id }),
    z.array(S.Slot), "user",
    "Bookable slots. Availability is re-checked at payment — never trust this alone.",
  ),

  // ── Screening ──────────────────────────────────────────────────────────────
  "screening.questions": ep(
    "GET", "/api/advisors/:advisorId/screening", z.object({ advisorId: S.Id }),
    z.array(S.ScreeningQuestion), "user",
    "The questions an advisee must answer before requesting this advisor.",
  ),
  "screening.submit": ep(
    "POST", "/api/screening/requests", S.SubmitScreeningInput, S.ScreeningRequest, "user",
    "Submit answers. CONFLICT if a pending request to this advisor already exists.",
  ),
  "screening.myRequest": ep(
    "GET", "/api/screening/requests/mine", z.object({ advisorId: S.Id }),
    S.ScreeningRequest.nullable(), "user",
    "The advisee's own request to one advisor — drives submitted/accepted/declined.",
  ),
  "screening.inbox": ep(
    "GET", "/api/screening/inbox", none, z.array(S.ScreeningRequest), "advisor",
    "Requests addressed to the signed-in advisor, pending first.",
  ),
  "screening.respond": ep(
    "POST", "/api/screening/requests/:requestId/respond",
    S.RespondToScreeningInput, S.ScreeningRequest, "advisor",
    "Accept or decline. The note is shown to the advisee verbatim.",
  ),
  "screening.saveQuestions": ep(
    "POST", "/api/screening/questions",
    S.SaveScreeningQuestionsInput, z.array(S.ScreeningQuestion), "advisor",
    "Replace the advisor's question list. Order follows the array.",
  ),

  // ── Bookings and payment ───────────────────────────────────────────────────
  "bookings.create": ep(
    "POST", "/api/bookings", S.CreateBookingInput, S.Booking, "user",
    "Reserve a slot. SLOT_TAKEN if it went while the advisee was deciding.",
  ),
  "bookings.list": ep(
    "GET", "/api/bookings", none, z.array(S.Booking), "user",
    "Upcoming and past bookings for whichever side the caller is on.",
  ),
  "payments.methods": ep(
    "GET", "/api/payments/methods", none, z.array(S.PaymentMethod), "user",
    "Saved cards. Last 4 only — a full PAN must never reach this API.",
  ),
  "payments.pay": ep(
    "POST", "/api/payments", S.PayInput, S.PayResult, "user",
    "Charge a booking. `outcome` maps 1:1 onto the five /checkout/* result screens.",
  ),
  "transactions.list": ep(
    "GET", "/api/transactions", S.PageQuery, S.Paginated(S.Transaction), "user",
    "Transaction history, newest first.",
  ),
  "invoices.get": ep(
    "GET", "/api/invoices/:invoiceId", z.object({ invoiceId: S.Id }), S.Invoice, "user",
    "Full invoice. `status` picks which of the three detail layouts renders.",
  ),

  // ── Reviews ────────────────────────────────────────────────────────────────
  "reviews.list": ep(
    "GET", "/api/advisors/:advisorId/reviews",
    S.PageQuery.extend({ advisorId: S.Id }), S.Paginated(S.Review), "public",
    "Public reviews for one advisor.",
  ),
  "reviews.summary": ep(
    "GET", "/api/advisors/:advisorId/reviews/summary", z.object({ advisorId: S.Id }),
    S.ReviewSummary, "public",
    "Average, total and the 1–5 distribution the bars are drawn from.",
  ),
  "reviews.submit": ep(
    "POST", "/api/reviews", S.SubmitReviewInput, S.Review, "user",
    "Rate a completed booking. ALREADY_REVIEWED or NOT_ELIGIBLE if it was cancelled.",
  ),
  "reviews.reply": ep(
    "POST", "/api/reviews/:reviewId/reply", S.ReplyToReviewInput, S.Review, "advisor",
    "The advisor's public reply.",
  ),

  // ── Advisor onboarding ─────────────────────────────────────────────────────
  "application.get": ep(
    "GET", "/api/advisor/application", none, S.AdvisorApplication.nullable(), "user",
    "The caller's advisor application, or null if they never started one.",
  ),
  "application.saveStage1": ep(
    "POST", "/api/advisor/application/stage-1",
    S.ApplicationStage1Input, S.AdvisorApplication, "user",
    "Save stage 1. VALIDATION_FAILED populates `fields` for the inline errors.",
  ),
  "application.attachDocument": ep(
    "POST", "/api/advisor/application/documents",
    S.ApplicationDocumentInput, S.AdvisorApplication, "user",
    "Attach a completed upload to stage 2 or 3. UPLOAD_REJECTED drives the rejected screen.",
  ),
  "application.submit": ep(
    "POST", "/api/advisor/application/submit", none, S.AdvisorApplication, "user",
    "Submit for review. VALIDATION_FAILED when a required document is missing.",
  ),

  // ── Advisor profile, earnings, payouts ─────────────────────────────────────
  "advisor.me": ep(
    "GET", "/api/advisor/me", none, S.Advisor, "advisor",
    "The signed-in advisor's own profile.",
  ),
  "advisor.saveSkills": ep(
    "POST", "/api/advisor/skills",
    z.object({ skills: z.array(z.object({ id: S.Id.nullish(), name: z.string().min(1) })) }),
    z.array(S.Skill), "advisor",
    "Replace the skill list.",
  ),
  "earnings.get": ep(
    "GET", "/api/earnings", none, S.Earnings, "advisor",
    "Available, pending and month-to-date, plus the breakdown rows.",
  ),
  "payouts.list": ep(
    "GET", "/api/payouts", S.PageQuery, S.Paginated(S.Payout), "advisor",
    "Payout history, newest first.",
  ),
  "payouts.account": ep(
    "GET", "/api/payouts/account", none, S.PayoutAccount.nullable(), "advisor",
    "The linked bank account, or null when none is set up yet.",
  ),
  "payouts.saveAccount": ep(
    "POST", "/api/payouts/account", S.PayoutAccountInput, S.PayoutAccount, "advisor",
    "Link or replace the payout account. Only the last 4 digits come back.",
  ),

  // ── Uploads ────────────────────────────────────────────────────────────────
  "uploads.create": ep(
    "POST", "/api/uploads", S.CreateUploadInput, S.Upload, "user",
    "Presigned PUT URL. File bytes go browser → R2 directly, never through the Worker.",
  ),
} as const satisfies Record<string, Endpoint>;

export type Contract = typeof contract;
export type EndpointKey = keyof Contract;

export type InputOf<K extends EndpointKey> = z.infer<Contract[K]["input"]>;
export type OutputOf<K extends EndpointKey> = z.infer<Contract[K]["output"]>;

/** Endpoints taking no payload — the client lets you omit the argument for these. */
export type NoInputKey = {
  [K in EndpointKey]: Contract[K]["input"] extends z.ZodVoid ? K : never;
}[EndpointKey];

/**
 * What a handler receives. Both the mock and the Worker build one of these.
 * `requireUser`/`requireAdvisor` throw `ApiError` rather than returning null so
 * a handler that forgets to check cannot accidentally serve data.
 */
export interface HandlerContext {
  readonly session: S.Session | null;
  requireUser(): S.User;
  requireAdvisor(): S.User;
}

/**
 * ★ The interface the backend implements.
 *
 * ```ts
 * export const handlers = {
 *   "session.get": async (_input, ctx) => ctx.session,
 *   // …every other key, or this line fails to compile
 * } satisfies Handlers;
 * ```
 */
export type Handlers = {
  [K in EndpointKey]: (
    input: InputOf<K>,
    ctx: HandlerContext,
  ) => Promise<OutputOf<K>>;
};

const PARAM_RE = /:([A-Za-z_][A-Za-z0-9_]*)/g;

/** The `:param` names in a path, in order. */
export function pathParams(path: string): string[] {
  return [...path.matchAll(PARAM_RE)].map((m) => m[1]);
}

/**
 * Fails when a path declares a `:param` the input schema has no field for —
 * which would otherwise produce a URL containing a literal ":threadId" and a
 * 404 that is annoying to trace. Run by `scripts/gen-openapi.ts`, so it gates
 * every build of the spec rather than costing anything at runtime.
 */
export function assertContractIntegrity(): void {
  const problems: string[] = [];

  for (const [key, endpoint] of Object.entries(contract)) {
    const params = pathParams(endpoint.path);
    if (params.length === 0) continue;

    const shape =
      endpoint.input instanceof z.ZodObject
        ? Object.keys((endpoint.input as z.ZodObject).shape)
        : [];

    for (const param of params) {
      if (!shape.includes(param)) {
        problems.push(
          `${key}: path "${endpoint.path}" needs ":${param}" but its input schema has no such field` +
            (shape.length ? ` (has: ${shape.join(", ")})` : " (input is not an object)"),
        );
      }
    }
  }

  const seen = new Map<string, string>();
  for (const [key, endpoint] of Object.entries(contract)) {
    const route = `${endpoint.method} ${endpoint.path}`;
    const other = seen.get(route);
    if (other) problems.push(`${key} and ${other} both claim ${route}`);
    else seen.set(route, key);
  }

  if (problems.length) {
    throw new Error(`Contract is inconsistent:\n  - ${problems.join("\n  - ")}`);
  }
}
