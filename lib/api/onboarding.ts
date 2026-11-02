import { ApiError, api } from "@/lib/api/client";
import type { ApiAdvisorBackground, ApiPortfolioItem } from "@/lib/api/types";

/**
 * Becoming an advisor, against `AdvisoryPlatformAPI` (docs/api-spec.md,
 * "Advisor onboarding"): apply (`POST /advisors/me`), send the ID card
 * (`POST /advisors/me/identity-verification`), then one proof per skill
 * (`POST /advisors/me/skill-proofs`). Applying does not make the account an
 * advisor; an admin approving the ID card does.
 */

/** `NONE` until an ID card is in; only `VERIFIED` means the account is an advisor. */
export type VerificationStatus = "NONE" | "SUBMITTED" | "VERIFIED" | "REJECTED";

/** `AdvisorOwnProfileResponseDto`. */
export interface ApiOwnAdvisorProfile {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly headline: string;
  readonly bio: string | null;
  readonly verificationStatus: VerificationStatus;
  readonly createdAt: string;
  readonly modifiedAt: string;
}

/** `OwnIdentityVerificationResponseDto`. */
export interface ApiOwnIdentityVerification {
  readonly advisorId: string;
  readonly verificationStatus: VerificationStatus;
  readonly rejectionReason: string | null;
  readonly submittedAt: string | null;
  readonly verifiedAt: string | null;
}

/** A 404 here means "has not applied" or "has not sent anything", not a failure. */
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** The caller's application, or `null` before they have applied. */
export function getOwnAdvisorProfile(signal?: AbortSignal): Promise<ApiOwnAdvisorProfile | null> {
  return orNull(api.get<ApiOwnAdvisorProfile>("advisors/me", { signal }));
}

export function createAdvisorProfile(body: {
  readonly headline: string;
  readonly bio?: string;
}): Promise<ApiOwnAdvisorProfile> {
  return api.post<ApiOwnAdvisorProfile>("advisors/me", { body });
}

export function updateAdvisorProfile(body: {
  readonly headline?: string;
  readonly bio?: string;
}): Promise<ApiOwnAdvisorProfile> {
  return api.patch<ApiOwnAdvisorProfile>("advisors/me", { body });
}

/** The caller's background: work, education, languages, licences and awards. */
export function getOwnAdvisorBackground(signal?: AbortSignal): Promise<ApiAdvisorBackground> {
  return api.get<ApiAdvisorBackground>("advisors/me/background", { signal });
}

/** Replaces every list of the caller's background at once, and answers what was stored. */
export function replaceOwnAdvisorBackground(body: ApiAdvisorBackground): Promise<ApiAdvisorBackground> {
  return api.put<ApiAdvisorBackground>("advisors/me/background", { body });
}

/** The words of a piece of work; an empty optional line clears it. */
export interface PortfolioItemInput {
  readonly title: string;
  readonly description?: string;
  readonly link?: string;
}

/** The most pieces a profile shows, and pictures a piece carries (`PORTFOLIO_*_MAX`). */
export const MAX_PORTFOLIO_ITEMS = 12;
export const MAX_PORTFOLIO_IMAGES = 4;

/** The caller's own pieces of work, in the order their profile shows them. */
export function listOwnPortfolio(signal?: AbortSignal): Promise<ApiPortfolioItem[]> {
  return api.get<ApiPortfolioItem[]>("advisors/me/portfolio", { signal });
}

/** A new piece, last in the order. Its pictures are added to it after. */
export function createPortfolioItem(body: PortfolioItemInput): Promise<ApiPortfolioItem> {
  return api.post<ApiPortfolioItem>("advisors/me/portfolio", { body });
}

export function updatePortfolioItem(id: string, body: PortfolioItemInput): Promise<ApiPortfolioItem> {
  return api.patch<ApiPortfolioItem>(`advisors/me/portfolio/${encodeURIComponent(id)}`, { body });
}

/** Takes the piece and its pictures away; answers the pieces left. */
export function deletePortfolioItem(id: string): Promise<ApiPortfolioItem[]> {
  return api.delete<ApiPortfolioItem[]>(`advisors/me/portfolio/${encodeURIComponent(id)}`);
}

/** One picture after the others (JPEG, PNG or WebP, up to 5 MiB). */
export function uploadPortfolioImage(id: string, file: File): Promise<ApiPortfolioItem> {
  const body = new FormData();
  body.append("file", file);
  return api.post<ApiPortfolioItem>(`advisors/me/portfolio/${encodeURIComponent(id)}/images`, { body });
}

/** Takes the picture at `index` out; the rest close up. */
export function removePortfolioImage(id: string, index: number): Promise<ApiPortfolioItem> {
  return api.delete<ApiPortfolioItem>(`advisors/me/portfolio/${encodeURIComponent(id)}/images/${index}`);
}

/** Every piece's id, in the order the profile should show them. */
export function reorderPortfolio(ids: readonly string[]): Promise<ApiPortfolioItem[]> {
  return api.put<ApiPortfolioItem[]>("advisors/me/portfolio/order", { body: { ids } });
}

/** The ID card's review, or `null` before one has been sent. */
export function getOwnIdentityVerification(
  signal?: AbortSignal,
): Promise<ApiOwnIdentityVerification | null> {
  return orNull(api.get<ApiOwnIdentityVerification>("advisors/me/identity-verification", { signal }));
}

/** JPG or PNG, at most 50 MB. `409` while one is under review or approved. */
export function submitIdentityDocument(document: File): Promise<unknown> {
  const body = new FormData();
  body.append("document", document);
  return api.post("advisors/me/identity-verification", { body });
}

/** One catalogue skill and its certificate (JPG, PNG or PDF, at most 50 MB). */
export function submitSkillProof(skillId: string, file: File): Promise<unknown> {
  const body = new FormData();
  body.append("skillId", skillId);
  body.append("file", file);
  return api.post("advisors/me/skill-proofs", { body });
}
