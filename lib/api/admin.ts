/**
 * The admin API: one function per route the console calls, and its response shapes.
 *
 * Separate from `./resources` and `./types` because the console is a separate
 * audience — nothing outside `components/cms/**` imports this, and nothing here is
 * reachable without an admin session. Keeping it in its own file also keeps the
 * public catalogue types from growing a second, admin-shaped vocabulary for the
 * same records (a service is `ApiPublicService` out there and `AdminService` here,
 * and they genuinely are different projections).
 *
 * Every shape below was read off the running API with a signed-in admin cookie,
 * then checked against the controller and DTO named beside it. Where a DTO types a
 * field `Date`, it is `string` here: it crossed JSON.
 *
 * ## Two things the whole file depends on
 *
 * **Authentication is the cookie.** `lib/api/client` sends `credentials: "include"`
 * on every request, so a call is authenticated the moment the browser holds a
 * better-auth session. Nothing here takes a token, an actor id or a session — and
 * the API records the acting admin from the session itself, which is why no ruling
 * below has an `adminId` parameter.
 *
 * **Money is integer satang.** `priceSatang`, `amountSatang`, `invoiceAmountSatang`
 * and the rest are integers. Divide only where you format.
 *
 * ## What the admin API does not have, and the console therefore cannot do
 *
 * Read this before wiring a screen, because each of these is a feature the console
 * had against `lib/mock-db` and cannot have against the API:
 *
 * - **No account update.** `admin/accounts` is list, get, suspend, reinstate. There
 *   is no `PATCH`, so display name, full name, email and timezone are read-only,
 *   and `phone` is not on the record at all.
 * - **No service mutation.** `GET /admin/services` is the only route on the
 *   controller: no publish, no hide, no edit, and no filter but `page`/`limit`.
 * - **No audit log** and no admin activity feed.
 * - **No aggregate/statistics route**, so the dashboard has nothing to read.
 * - **No transactions route.**
 * - **`service-categories` has no slug and no published status**, and **`skills`
 *   has no category** — the three fields the console's taxonomy screen used to edit.
 * - **Identity approval takes no body**, so an advisor level cannot be set with it.
 * - **Refund approval takes no body**, so a partial refund cannot be granted.
 * - **`mark-failed` takes no body**, so a payout failure has no recorded reason.
 * - **Report resolution is `ACTIONED | DISMISSED`** — there is no "warn" and no
 *   "suspend the account" outcome, and no note field.
 * - **An off-platform flag carries `messageId` and `matchedPattern` only** — no
 *   message text, no sender, no risk level, no signal breakdown — and has **no
 *   detail route**, only the list.
 * - **Documents are storage keys, not URLs.** `documentObjectKey`, a skill proof's
 *   `objectKey` and refund evidence keys are SeaweedFS keys; there is no admin
 *   presign route, so nothing here can render the document.
 *
 * ## Rulings, and the two failures that are not bugs
 *
 * A ruling on a record already in a terminal state answers **409** with the API's
 * own sentence ("This refund case has already been resolved", "Account is not
 * suspended"). A ruling by an admin with no `admin_profiles` row answers **403
 * "Ruling requires an admin profile row for the signed-in admin"**. Both are
 * `ApiError` with a `message` worth showing verbatim — neither is a generic
 * failure, and a caller that collapses them into "something went wrong" throws
 * away the only thing that tells the admin what to do next.
 */

import { api, type Paginated } from "@/lib/api/client";

/* ------------------------------------------------------------------- enums */

/** `userStatusEnum` — `schema/auth-supplements.ts`. */
export type AdminAccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

/** `ACCOUNT_ROLES` — `admin-accounts.constants.ts`. Lowercase, unlike `Role`. */
export type AdminAccountRole = "admin" | "advisor" | "advisee";

/** `identityVerificationStatusEnum` — `schema/advisor.ts`. */
export type IdentityStatus = "NONE" | "SUBMITTED" | "VERIFIED" | "REJECTED";

/** `skillProofReviewStatusEnum` — `schema/advisor.ts`. */
export type SkillProofReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

/** `refundCaseStatusEnum` — `schema/payment.ts`. Note `OPEN`, not `PENDING`. */
export type RefundCaseStatus = "OPEN" | "APPROVED" | "REJECTED";

/** `payoutStatusEnum` — `schema/payment.ts`. */
export type AdminPayoutStatus = "PENDING" | "PAID" | "FAILED";

/** `invoiceStatusEnum` — `schema/payment.ts`. */
export type InvoiceStatus =
  | "PENDING"
  | "HELD_IN_ESCROW"
  | "RELEASED"
  | "REFUNDED"
  | "FAILED";

/** `userReportStatusEnum` — `schema/safety.ts`. */
export type ReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";

/** `REPORT_OUTCOMES` — the only values `resolve` accepts; `OPEN` is rejected. */
export type ReportOutcome = "ACTIONED" | "DISMISSED";

/** `offPlatformFlagStatusEnum` — `schema/safety.ts`. */
export type OffPlatformFlagStatus = "PENDING_REVIEW" | "CONFIRMED" | "DISMISSED";

/** `FLAG_OUTCOMES` — the only values `resolve` accepts. */
export type OffPlatformFlagOutcome = "CONFIRMED" | "DISMISSED";

/** Every list route inherits `OffsetPaginationDto`: `limit` is capped at 100. */
export interface AdminPageQuery {
  readonly page?: number;
  readonly limit?: number;
}

/** The API's own ceiling on `limit`, so a caller does not ask for 400 back. */
export const ADMIN_MAX_LIMIT = 100;

/**
 * The `useResource` key prefix per queue.
 *
 * A screen reads under `` `${ADMIN_KEYS.refunds}?limit=100` `` and a ruling calls
 * `invalidate(ADMIN_KEYS.refunds)`, which drops every page and filter of that queue
 * at once. They live here, beside the routes they are named after, so a list screen
 * and its detail screen agree without one importing the other — importing a
 * constant out of a screen module drags that screen's whole bundle into the other
 * route.
 */
export const ADMIN_KEYS = {
  accounts: "admin/accounts",
  identity: "admin/identity-verifications",
  skillProofs: "admin/skill-proofs",
  refunds: "admin/refunds",
  payouts: "admin/payouts",
  reports: "admin/reports",
  flags: "admin/off-platform-flags",
  services: "admin/services",
  categories: "service-categories",
  skills: "skills",
} as const;

/* ---------------------------------------------------------------- accounts */

/** `AdminAccountResponseDto` — admin-accounts/dtos/admin-account-response.dto.ts */
export interface AdminAccount {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly fullName: string;
  /** A storage key, not a URL, and there is no admin route that presigns it. */
  readonly avatarKey: string | null;
  /** better-auth's profile-picture URL — drawable as-is, which `avatarKey` is not. */
  readonly image: string | null;
  readonly timezone: string;
  readonly status: AdminAccountStatus;
  readonly role: AdminAccountRole | null;
  /**
   * better-auth's own flag, which is **not** `status`. A ban written through
   * better-auth's `ban-user` leaves `status = 'ACTIVE'`; the console suspends
   * through `suspendAccount` below, which writes both.
   */
  readonly banned: boolean;
  readonly banReason: string | null;
  readonly banExpires: string | null;
  readonly createdAt: string;
  /** `updatedAt` here, while services use `modifiedAt`. The API is not uniform. */
  readonly updatedAt: string;
}

/** `AdminAccountDetailResponseDto` — the list shape plus one derived flag. */
export interface AdminAccountDetail extends AdminAccount {
  readonly hasAdvisorProfile: boolean;
}

export interface AdminAccountQuery extends AdminPageQuery {
  readonly status?: AdminAccountStatus;
  readonly role?: AdminAccountRole;
  /** Matched case-insensitively against display name and email. Max 120 chars. */
  readonly q?: string;
}

/** `GET /admin/accounts`. */
export function listAdminAccounts(
  query: AdminAccountQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<AdminAccount>> {
  return api.get("admin/accounts", { query: { ...query }, signal });
}

/** `GET /admin/accounts/:userId` — 404 "Account not found". */
export function getAdminAccount(
  userId: string,
  signal?: AbortSignal,
): Promise<AdminAccountDetail> {
  return api.get(`admin/accounts/${userId}`, { signal });
}

/**
 * `POST /admin/accounts/:userId/suspend` — the only correct way to suspend.
 *
 * better-auth's `ban-user` writes `banned`/`ban_reason` and knows nothing about
 * the `user.status` column, so a ban through it leaves `status = 'ACTIVE'` while
 * the account cannot sign in, and every query that filters on status then
 * disagrees with auth. This route writes both.
 *
 * `reason` is required and capped at 500 characters. Answers 400 for your own
 * account, 409 when already suspended, and 409 for a deleted account.
 */
export function suspendAccount(
  userId: string,
  reason: string,
  signal?: AbortSignal,
): Promise<AdminAccount> {
  return api.post(`admin/accounts/${userId}/suspend`, { body: { reason }, signal });
}

/** `POST /admin/accounts/:userId/reinstate` — no body. 409 when not suspended. */
export function reinstateAccount(
  userId: string,
  signal?: AbortSignal,
): Promise<AdminAccount> {
  return api.post(`admin/accounts/${userId}/reinstate`, { signal });
}

/* ------------------------------------------------------ identity verification */

/**
 * `IdentityVerificationResponseDto`.
 *
 * Keyed by `advisorId`, not an id of its own — `advisor_identity` has no
 * surrogate key. `nationalIdEncrypted`/`nationalIdHash` are never returned.
 */
export interface IdentityVerification {
  readonly advisorId: string;
  readonly displayName: string;
  readonly email: string;
  readonly verificationStatus: IdentityStatus;
  /** SeaweedFS object key. Not a URL, and nothing presigns it for an admin. */
  readonly documentObjectKey: string | null;
  readonly rejectionReason: string | null;
  readonly submittedAt: string | null;
  readonly verifiedAt: string | null;
  readonly verifiedByAdminId: string | null;
}

export interface IdentityVerificationQuery extends AdminPageQuery {
  readonly status?: IdentityStatus;
}

/** `GET /admin/identity-verifications`. */
export function listIdentityVerifications(
  query: IdentityVerificationQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<IdentityVerification>> {
  return api.get("admin/identity-verifications", { query: { ...query }, signal });
}

/** `GET /admin/identity-verifications/:advisorId`. */
export function getIdentityVerification(
  advisorId: string,
  signal?: AbortSignal,
): Promise<IdentityVerification> {
  return api.get(`admin/identity-verifications/${advisorId}`, { signal });
}

/**
 * `POST /admin/identity-verifications/:advisorId/approve` — **no body**.
 *
 * There is no advisor level on this route, so approving cannot set one. 409 when
 * already decided, and 409 when nothing has been submitted yet.
 */
export function approveIdentityVerification(
  advisorId: string,
  signal?: AbortSignal,
): Promise<IdentityVerification> {
  return api.post(`admin/identity-verifications/${advisorId}/approve`, { signal });
}

/** `POST .../:advisorId/reject` — `reason` required, max 4000. */
export function rejectIdentityVerification(
  advisorId: string,
  reason: string,
  signal?: AbortSignal,
): Promise<IdentityVerification> {
  return api.post(`admin/identity-verifications/${advisorId}/reject`, {
    body: { reason },
    signal,
  });
}

/* ------------------------------------------------------------- skill proofs */

/** `SkillProofResponseDto`. */
export interface SkillProof {
  readonly id: string;
  readonly advisorId: string;
  readonly advisorDisplayName: string;
  readonly skillId: string;
  readonly skillName: string;
  /** SeaweedFS object key, never null — and never a URL. */
  readonly objectKey: string;
  readonly originalFileName: string;
  readonly reviewStatus: SkillProofReviewStatus;
  readonly rejectionReason: string | null;
  readonly reviewedByAdminId: string | null;
  readonly reviewedAt: string | null;
  readonly createdAt: string;
}

export interface SkillProofQuery extends AdminPageQuery {
  readonly reviewStatus?: SkillProofReviewStatus;
  readonly advisorId?: string;
}

/** `GET /admin/skill-proofs`. */
export function listSkillProofs(
  query: SkillProofQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<SkillProof>> {
  return api.get("admin/skill-proofs", { query: { ...query }, signal });
}

/** `GET /admin/skill-proofs/:proofId`. */
export function getSkillProof(
  proofId: string,
  signal?: AbortSignal,
): Promise<SkillProof> {
  return api.get(`admin/skill-proofs/${proofId}`, { signal });
}

/** `POST .../:proofId/approve` — no body. 409 when already reviewed. */
export function approveSkillProof(
  proofId: string,
  signal?: AbortSignal,
): Promise<SkillProof> {
  return api.post(`admin/skill-proofs/${proofId}/approve`, { signal });
}

/** `POST .../:proofId/reject` — `reason` required, max 4000. */
export function rejectSkillProof(
  proofId: string,
  reason: string,
  signal?: AbortSignal,
): Promise<SkillProof> {
  return api.post(`admin/skill-proofs/${proofId}/reject`, { body: { reason }, signal });
}

/* ----------------------------------------------------------------- refunds */

/** `AdminRefundCaseResponseDto`. */
export interface AdminRefundCase {
  readonly id: string;
  readonly invoiceId: string;
  readonly requestedByUserId: string;
  readonly requesterDisplayName: string;
  /** Integer satang. The booking, the service and the session are not on this row. */
  readonly invoiceAmountSatang: number;
  /** The requester's own words, free text. */
  readonly reason: string;
  readonly status: RefundCaseStatus;
  readonly reviewedByAdminId: string | null;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

/** One attached file. A key and a name — there is no URL to open it with. */
export interface RefundEvidence {
  readonly objectKey: string;
  readonly originalFileName: string;
  readonly mimeType: string;
  readonly createdAt: string;
}

/** `AdminRefundCaseDetailResponseDto` — the list shape plus the evidence list. */
export interface AdminRefundCaseDetail extends AdminRefundCase {
  readonly evidence: readonly RefundEvidence[];
}

export interface AdminRefundQuery extends AdminPageQuery {
  readonly status?: RefundCaseStatus;
}

/** `GET /admin/refunds`. */
export function listRefundCases(
  query: AdminRefundQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<AdminRefundCase>> {
  return api.get("admin/refunds", { query: { ...query }, signal });
}

/** `GET /admin/refunds/:refundCaseId`. */
export function getRefundCase(
  refundCaseId: string,
  signal?: AbortSignal,
): Promise<AdminRefundCaseDetail> {
  return api.get(`admin/refunds/${refundCaseId}`, { signal });
}

/**
 * `POST /admin/refunds/:refundCaseId/approve` — **no body**.
 *
 * So a refund is all-or-nothing: there is no amount to send, and a partial
 * refund cannot be granted through this route.
 */
export function approveRefundCase(
  refundCaseId: string,
  signal?: AbortSignal,
): Promise<AdminRefundCase> {
  return api.post(`admin/refunds/${refundCaseId}/approve`, { signal });
}

/**
 * `POST .../:refundCaseId/reject` — `reason` required, max 4000.
 *
 * The reason is validated and then only written to the service log: `refund_cases`
 * has no column for it, so it never comes back on any response. Do not show it
 * back to the admin as though it had been stored.
 */
export function rejectRefundCase(
  refundCaseId: string,
  reason: string,
  signal?: AbortSignal,
): Promise<AdminRefundCase> {
  return api.post(`admin/refunds/${refundCaseId}/reject`, { body: { reason }, signal });
}

/* ----------------------------------------------------------------- payouts */

/** `AdminPayoutResponseDto`. No bank name and no account number anywhere. */
export interface AdminPayout {
  readonly id: string;
  readonly advisorId: string;
  readonly advisorDisplayName: string;
  /** Integer satang. */
  readonly amountSatang: number;
  readonly transferFeeSatang: number;
  /** Integer satang, computed by the API as `amountSatang - transferFeeSatang`. */
  readonly netAmountSatang: number;
  readonly providerTransferId: string | null;
  readonly status: AdminPayoutStatus;
  readonly createdAt: string;
  readonly paidAt: string | null;
}

/** One invoice inside a payout, on the detail route only. */
export interface AdminPayoutInvoice {
  readonly invoiceId: string;
  readonly appointmentId: string;
  readonly amountSatang: number;
  readonly platformFeeSatang: number;
  readonly status: InvoiceStatus;
  readonly payoutEligibleAt: string | null;
  readonly createdAt: string;
}

/** `AdminPayoutDetailResponseDto`. */
export interface AdminPayoutDetail extends AdminPayout {
  readonly invoices: readonly AdminPayoutInvoice[];
  readonly invoicedTotalSatang: number;
}

export interface AdminPayoutQuery extends AdminPageQuery {
  readonly status?: AdminPayoutStatus;
  readonly advisorId?: string;
}

/** `GET /admin/payouts`. */
export function listPayouts(
  query: AdminPayoutQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<AdminPayout>> {
  return api.get("admin/payouts", { query: { ...query }, signal });
}

/** `GET /admin/payouts/:payoutId`. */
export function getPayout(
  payoutId: string,
  signal?: AbortSignal,
): Promise<AdminPayoutDetail> {
  return api.get(`admin/payouts/${payoutId}`, { signal });
}

/**
 * `POST /admin/payouts/:payoutId/mark-paid`.
 *
 * `providerTransferId` is optional; omitting it leaves whatever is already stored
 * rather than clearing it. 409 "This payout has already been settled".
 */
export function markPayoutPaid(
  payoutId: string,
  providerTransferId?: string,
  signal?: AbortSignal,
): Promise<AdminPayout> {
  return api.post(`admin/payouts/${payoutId}/mark-paid`, {
    body: providerTransferId ? { providerTransferId } : {},
    signal,
  });
}

/**
 * `POST /admin/payouts/:payoutId/mark-failed` — **no body at all**.
 *
 * `payouts` has no failure-reason column, so the bank's reason cannot be
 * recorded. Do not ask an admin for one.
 */
export function markPayoutFailed(
  payoutId: string,
  signal?: AbortSignal,
): Promise<AdminPayout> {
  return api.post(`admin/payouts/${payoutId}/mark-failed`, { signal });
}

/* ----------------------------------------------------------------- reports */

/** `AdminReportResponseDto`. */
export interface AdminReport {
  readonly id: string;
  readonly reporterUserId: string;
  readonly reporterDisplayName: string;
  readonly reportedUserId: string;
  readonly reportedDisplayName: string;
  readonly chatRoomId: string | null;
  /** Free text, **not** a category enum, and the only description of the case. */
  readonly reason: string;
  readonly status: ReportStatus;
  readonly reviewedByAdminId: string | null;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

export interface AdminReportQuery extends AdminPageQuery {
  readonly status?: ReportStatus;
}

/** `GET /admin/reports`. */
export function listReports(
  query: AdminReportQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<AdminReport>> {
  return api.get("admin/reports", { query: { ...query }, signal });
}

/** `GET /admin/reports/:reportId`. */
export function getReport(reportId: string, signal?: AbortSignal): Promise<AdminReport> {
  return api.get(`admin/reports/${reportId}`, { signal });
}

/**
 * `POST /admin/reports/:reportId/resolve`.
 *
 * `outcome` is `ACTIONED` or `DISMISSED` and nothing else — there is no warning
 * outcome, no suspend-the-account outcome and no note field (the body is
 * whitelisted, so an extra key is a 400). Suspending the reported account is a
 * separate call to `suspendAccount`.
 *
 * 403 when the signed-in admin has no `admin_profiles` row; 409 when already
 * resolved.
 */
export function resolveReport(
  reportId: string,
  outcome: ReportOutcome,
  signal?: AbortSignal,
): Promise<AdminReport> {
  return api.post(`admin/reports/${reportId}/resolve`, { body: { outcome }, signal });
}

/* ------------------------------------------------------- off-platform flags */

/**
 * `OffPlatformFlagResponseDto`.
 *
 * All the scanner records is which message and which pattern. There is no message
 * text, no sender, no recipient, no conversation and no risk level, so a console
 * screen cannot show any of them.
 */
export interface OffPlatformFlag {
  readonly id: string;
  readonly messageId: string;
  readonly matchedPattern: string;
  readonly status: OffPlatformFlagStatus;
  readonly reviewedByAdminId: string | null;
  readonly penaltyPointsApplied: number;
  readonly createdAt: string;
  readonly reviewedAt: string | null;
}

export interface OffPlatformFlagQuery extends AdminPageQuery {
  readonly status?: OffPlatformFlagStatus;
}

/**
 * `GET /admin/off-platform-flags`.
 *
 * There is **no** `GET /admin/off-platform-flags/:flagId`, so a detail view has to
 * find its row in this list.
 */
export function listOffPlatformFlags(
  query: OffPlatformFlagQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<OffPlatformFlag>> {
  return api.get("admin/off-platform-flags", { query: { ...query }, signal });
}

/**
 * `POST /admin/off-platform-flags/:flagId/resolve`.
 *
 * `penaltyPointsApplied` defaults to 0 and is a 400 when above 0 for any outcome
 * but `CONFIRMED`. 403 without an `admin_profiles` row; 409 when already reviewed.
 */
export function resolveOffPlatformFlag(
  flagId: string,
  outcome: OffPlatformFlagOutcome,
  penaltyPointsApplied?: number,
  signal?: AbortSignal,
): Promise<OffPlatformFlag> {
  return api.post(`admin/off-platform-flags/${flagId}/resolve`, {
    body:
      penaltyPointsApplied === undefined
        ? { outcome }
        : { outcome, penaltyPointsApplied },
    signal,
  });
}

/* ---------------------------------------------------------------- services */

/**
 * `AdvisorServiceResponseDto`, as `GET /admin/services` returns it.
 *
 * `isPublished` is a boolean, not a status enum. There is no advisor name on the
 * row and no rating or booking count anywhere on the API, so a console table can
 * show the listing and its category and nothing more.
 */
export interface AdminService {
  readonly id: string;
  readonly advisorId: string;
  readonly categoryId: string;
  readonly availabilityProfileId: string | null;
  readonly name: string;
  readonly description: string | null;
  /** Integer satang. */
  readonly priceSatang: number;
  readonly durationMinutes: number;
  readonly dailyConsultationLimitMinutes: number | null;
  readonly isPublished: boolean;
  readonly screeningRequired: boolean;
  readonly trialEnabled: boolean;
  readonly trialDurationMinutes: number | null;
  readonly createdAt: string;
  /** `modifiedAt` here, while accounts use `updatedAt`. */
  readonly modifiedAt: string;
}

/**
 * `GET /admin/services` — the whole controller.
 *
 * `page` and `limit` are the only query parameters: no status, advisor or category
 * filter exists. Unpublished services are included, which is the point of it.
 */
export function listAdminServices(
  query: AdminPageQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<AdminService>> {
  return api.get("admin/services", { query: { ...query }, signal });
}

/* ---------------------------------------------------------------- taxonomy */

/**
 * `ServiceCategoryResponseDto` and `SkillResponseDto` — the same four fields.
 *
 * A category has **no slug and no published status**; a skill has **no category**.
 * The console's taxonomy screen used to edit all three, and cannot.
 */
export interface TaxonomyRecord {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: string;
  readonly modifiedAt: string;
}

/** Both create DTOs: `name` required and capped at 100, `description` optional. */
export interface TaxonomyInput {
  readonly name: string;
  readonly description?: string;
}

/**
 * `GET /service-categories` — public, so this is also what the catalogue reads.
 * Unprefixed by `/admin`: the categories controller is not an admin controller,
 * and `create`/`update`/`delete` on it are granted to advisors as well as admins.
 */
export function listCategories(
  query: AdminPageQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<TaxonomyRecord>> {
  return api.get("service-categories", { query: { ...query }, signal });
}

/** `POST /service-categories` — 201. */
export function createCategory(
  input: TaxonomyInput,
  signal?: AbortSignal,
): Promise<TaxonomyRecord> {
  return api.post("service-categories", { body: input, signal });
}

/** `PATCH /service-categories/:id` — every field optional. */
export function updateCategory(
  id: string,
  input: Partial<TaxonomyInput>,
  signal?: AbortSignal,
): Promise<TaxonomyRecord> {
  return api.patch(`service-categories/${id}`, { body: input, signal });
}

/** `DELETE /service-categories/:id` — 200, and answers with the deleted row. */
export function deleteCategory(
  id: string,
  signal?: AbortSignal,
): Promise<TaxonomyRecord> {
  return api.delete(`service-categories/${id}`, { signal });
}

/** `GET /skills` — public. */
export function listAdminSkills(
  query: AdminPageQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<TaxonomyRecord>> {
  return api.get("skills", { query: { ...query }, signal });
}

/** `POST /skills` — 201. */
export function createSkill(
  input: TaxonomyInput,
  signal?: AbortSignal,
): Promise<TaxonomyRecord> {
  return api.post("skills", { body: input, signal });
}

/** `PATCH /skills/:id`. */
export function updateSkill(
  id: string,
  input: Partial<TaxonomyInput>,
  signal?: AbortSignal,
): Promise<TaxonomyRecord> {
  return api.patch(`skills/${id}`, { body: input, signal });
}

/** `DELETE /skills/:id` — 200, and answers with the deleted row. */
export function deleteSkill(
  id: string,
  signal?: AbortSignal,
): Promise<TaxonomyRecord> {
  return api.delete(`skills/${id}`, { signal });
}
