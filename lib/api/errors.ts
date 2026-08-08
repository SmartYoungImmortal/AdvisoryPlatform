import { z } from "zod";

/**
 * The closed set of failures the UI reacts to. Everything else is `INTERNAL`.
 *
 * These exist because the Figma designs have a dedicated screen per failure —
 * `/login/wrong-password`, `/login/account-locked`, `/register/email-in-use`,
 * `/checkout/slot-taken`, `/settings/delete/blocked`. The frontend picks the
 * screen from this code, so **the code is load-bearing UI**: returning
 * `INTERNAL` where `SLOT_TAKEN` was meant shows the user a generic error
 * instead of the screen a designer drew for that case.
 */
export const ApiErrorCode = z.enum([
  // auth
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "EMAIL_IN_USE",
  "WEAK_PASSWORD",
  // validation
  "VALIDATION_FAILED",
  // resources
  "NOT_FOUND",
  "CONFLICT",
  // domain-specific
  "SLOT_TAKEN",
  "PAYMENT_DECLINED",
  "PAYMENT_UNCONFIRMED",
  "DELETION_BLOCKED",
  "UPLOAD_REJECTED",
  "ALREADY_REVIEWED",
  "NOT_ELIGIBLE",
  // transport
  "RATE_LIMITED",
  "NETWORK",
  "INTERNAL",
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

/** The body every non-2xx response carries. */
export const ApiErrorBody = z.object({
  code: ApiErrorCode,
  /** For logs and debugging. Never rendered — the UI owns all user-facing copy. */
  message: z.string(),
  /**
   * Per-field messages for `VALIDATION_FAILED`, keyed by the input field name.
   * Feeds straight into the form's error slots.
   */
  fields: z.record(z.string(), z.string()).nullish(),
});

export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

/** HTTP status per code, so the Worker and the mock agree without a lookup table each. */
export const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_LOCKED: 403,
  EMAIL_IN_USE: 409,
  WEAK_PASSWORD: 422,
  VALIDATION_FAILED: 422,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SLOT_TAKEN: 409,
  PAYMENT_DECLINED: 402,
  PAYMENT_UNCONFIRMED: 202,
  DELETION_BLOCKED: 409,
  UPLOAD_REJECTED: 422,
  ALREADY_REVIEWED: 409,
  NOT_ELIGIBLE: 403,
  RATE_LIMITED: 429,
  NETWORK: 503,
  INTERNAL: 500,
};

/**
 * Thrown by the client on any failure — including a dropped connection, which
 * surfaces as `NETWORK` rather than a raw `TypeError`. Callers can therefore
 * `switch` on `code` exhaustively without a separate transport-error path.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string> | null;

  constructor(body: ApiErrorBody, status?: number, cause?: unknown) {
    super(body.message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.code = body.code;
    this.status = status ?? STATUS_BY_CODE[body.code];
    this.fields = body.fields;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Convenience for handlers: `throw apiError("SLOT_TAKEN", "…")`. */
export function apiError(
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>,
): ApiError {
  return new ApiError({ code, message, fields });
}
