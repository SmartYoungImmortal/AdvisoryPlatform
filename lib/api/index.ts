/**
 * The single import screens use: `import { call } from "@/lib/api"`.
 *
 * This file is the mock/live switch. Today it is HTTP only; M1 adds the mock
 * transport and selects between them on `NEXT_PUBLIC_API_MODE`, which is
 * inlined at build time so the unused branch is dropped from the bundle.
 * Screens never change when that happens.
 */
export { call } from "./client";
export { ApiError, apiError, isApiError, type ApiErrorCode } from "./errors";
export type {
  EndpointKey,
  Handlers,
  HandlerContext,
  InputOf,
  OutputOf,
} from "./contract";
export * from "./schema";
