import { ApiError, api } from "@/lib/api/client";

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
