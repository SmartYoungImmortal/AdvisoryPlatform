/**
 * The API's response shapes, transcribed from its DTOs.
 *
 * Hand-written rather than generated, deliberately and temporarily: the API
 * publishes Swagger at `/api/v1/docs`, and once it has a stable public URL these
 * should come from a generator pointed at it. Until then the source of truth is
 * the DTO file named against each type below, so a drift has somewhere to be
 * checked against.
 *
 * Two conventions of the API that the frontend must not quietly re-interpret:
 *
 * Money is **satang**, always an integer — `priceSatang`, never a float of baht.
 * Dividing at the boundary would put rounding in every call site; it is divided
 * once, where it is formatted.
 *
 * Timestamps arrive as ISO 8601 strings because they crossed JSON, even where the
 * DTO declares `Date`. They are typed as strings here for that reason; anything
 * that needs date arithmetic parses them itself.
 */

/** `PublicServiceResponseDto` — advisor-services/dtos/public-service-response.dto.ts */
export interface ApiPublicService {
  readonly id: string;
  readonly advisorId: string;
  readonly categoryId: string;
  readonly name: string;
  readonly description: string;
  readonly priceSatang: number;
  readonly durationMinutes: number;
  readonly screeningRequired: boolean;
  readonly trialEnabled: boolean;
  readonly trialDurationMinutes: number | null;
}

/** `PublicServiceQueryDto` — the filters `GET /services` accepts. */
export interface ApiPublicServiceQuery {
  readonly page?: number;
  /** 1 to 100; the API rejects more. */
  readonly limit?: number;
  readonly q?: string;
  readonly categoryId?: string;
  readonly advisorId?: string;
  readonly minPriceSatang?: number;
  readonly maxPriceSatang?: number;
}

/** `PublicAdvisorResponseDto` — advisors/dtos/public-advisor-response.dto.ts */
export interface ApiPublicAdvisor {
  readonly id: string;
  readonly displayName: string;
  readonly headline: string;
  readonly bio: string | null;
  /** A storage key, not a URL — the avatar endpoint presigns it. */
  readonly avatarKey: string | null;
  readonly skills: readonly string[];
  readonly publishedServiceCount: number;
}

/** `PublicAdvisorQueryDto` — the filters `GET /advisors` accepts. */
export interface ApiPublicAdvisorQuery {
  readonly page?: number;
  /** 1 to 100; the API rejects more. */
  readonly limit?: number;
  /** Matched against the display name and the headline. */
  readonly q?: string;
  readonly skillId?: string;
}

/** `AvailabilitySlotResponseDto` — availability/dtos/availability.dto.ts:134 */
export interface ApiSlot {
  readonly startTime: string;
  readonly endTime: string;
}

/** `GET /services/:serviceId/slots` takes a closed date range, both required. */
export interface ApiSlotQuery {
  /** `YYYY-MM-DD` */
  readonly from: string;
  /** `YYYY-MM-DD` */
  readonly to: string;
}

/** `ReviewResponseDto` — reviews/dtos */
export interface ApiReview {
  readonly appointmentId: string;
  readonly stars: number;
  readonly comment: string | null;
  readonly advisorReply: string | null;
  readonly createdAt: string;
  readonly modifiedAt: string;
  readonly appointmentStartTime: string;
  readonly serviceName: string;
  readonly serviceDurationMinutes: number;
  readonly reviewerDisplayName: string;
  /** A storage key, not a URL. See `avatarUrl` on the user endpoints. */
  readonly reviewerAvatarKey: string | null;
}

/** `RatingDistributionDto` — one bar of the histogram. */
export interface ApiRatingBar {
  readonly stars: number;
  readonly count: number;
}

/** `AdvisorRatingSummaryDto` — `GET /advisors/:advisorId/reviews/summary` */
export interface ApiRatingSummary {
  readonly average: number;
  readonly total: number;
  readonly distribution: readonly ApiRatingBar[];
}

/** `UserOwnProfileResponseDto` — users/dtos */
export interface ApiOwnProfile {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly fullName: string | null;
  readonly avatarKey: string | null;
  readonly timezone: string;
  readonly roles: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** `UserAvatarUrlResponseDto` — a presigned URL, which is why it expires. */
export interface ApiAvatarUrl {
  readonly url: string;
  readonly expiresInSeconds: number;
}

/** `GET /service-categories` and `GET /skills` — the two taxonomies. */
export interface ApiNamedRecord {
  readonly id: string;
  readonly name: string;
}

/* ----------------------------------------------------------------- bookings */

/**
 * `appointment_state` — database/schema/booking.ts:15, and the whole lifecycle a
 * booking has.
 *
 * `PENDING_PAYMENT` is where `POST /bookings` leaves every row: the time is held
 * and nothing has been charged. The advisee's own transitions are the two the
 * bookings controller exposes — cancel, which writes `CANCELLED`, and reschedule.
 * `IN_PROGRESS`, `COMPLETED` and `NO_SHOW` are written by the advisor's side, so
 * a screen reads them and never sends them.
 */
export type ApiBookingState =
  | "PENDING_PAYMENT"
  | "BOOKED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

/**
 * `BookingResponseDto` — bookings/dtos/booking-response.dto.ts
 *
 * It is the appointment row and nothing more: no service name, no advisor name,
 * no amount. A list of these is unreadable on its own, so a screen showing them
 * joins `listServices` and `listAdvisors` by `serviceId` / `advisorId` — the same
 * trade `components/home/browse-list.tsx` makes for one card's advisor name.
 *
 * `unavailableUntil` is the end of the range this booking blocks, which is
 * `endTime` plus the advisor's buffer, and `blocksAvailability` goes false once a
 * cancellation gave the range back — see `reopensAvailability` in the API.
 */
export interface ApiBooking {
  readonly id: string;
  readonly serviceId: string;
  readonly advisorId: string;
  readonly adviseeId: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly unavailableUntil: string;
  readonly state: ApiBookingState;
  readonly blocksAvailability: boolean;
  readonly cancelledAt: string | null;
  readonly cancelledByUserId: string | null;
  readonly createdAt: string;
}

/** `OffsetPaginationDto` — the page/limit pair every paginated route accepts. */
export interface ApiPageQuery {
  readonly page?: number;
  /** 1 to 100; the API rejects more. */
  readonly limit?: number;
}

/** `CreateBookingDto` — bookings/dtos/create-booking.dto.ts */
export interface ApiBookingInput {
  readonly serviceId: string;
  /** ISO 8601, and the exact `startTime` of a slot the slots route returned. */
  readonly startTime: string;
}

/* ------------------------------------------------------------- own reviews */

/** `CreateReviewDto` — reviews/dtos/create-review.dto.ts. The comment is optional. */
export interface ApiReviewInput {
  /** 1 to 5, integer. */
  readonly stars: number;
  readonly comment?: string;
}

/* ------------------------------------------------------------------ refunds */

/** `refund_case_status` — database/schema/payment.ts:35 */
export type ApiRefundCaseStatus = "OPEN" | "APPROVED" | "REJECTED";

/**
 * `RefundCaseResponseDto` — refunds/dtos/refund-case-response.dto.ts
 *
 * The requester's own view, which deliberately omits the admin who ruled on it.
 * It names an `invoiceId` and no amount, and there is no advisee-facing invoice
 * route to resolve that id against — see `openRefundCase`.
 */
export interface ApiRefundCase {
  readonly id: string;
  readonly invoiceId: string;
  readonly reason: string;
  readonly status: ApiRefundCaseStatus;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

/** `CreateRefundCaseDto` — refunds/dtos/create-refund-case.dto.ts */
export interface ApiRefundCaseInput {
  readonly invoiceId: string;
  /** 1 to `REFUND_REASON_MAX_LENGTH` characters; the API trims it first. */
  readonly reason: string;
}

/* ------------------------------------------------------------------ payment */

/**
 * `CheckoutDto` — payment/dto/checkout.dto.ts
 *
 * `cardToken` is an Omise token (`tokn_…`), minted in the browser by Omise's own
 * script against the publishable key. Nothing in this app loads that script, so
 * there is no way to produce this value here yet — see `startCheckout`.
 */
export interface ApiCheckoutInput {
  readonly serviceId: string;
  /** One or more slot starts, ISO 8601. */
  readonly startTimes: readonly string[];
  readonly cardToken: string;
}
