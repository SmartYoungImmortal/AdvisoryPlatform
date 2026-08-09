import type { Handlers } from "@/lib/api/contract";

import type { WorkerContext } from "../context";

import { advisorHandlers } from "./advisor";
import { commerceHandlers } from "./commerce";
import { discoveryHandlers } from "./discovery";
import { identityHandlers } from "./identity";
import { messagingHandlers } from "./messaging";
import { onboardingHandlers } from "./onboarding";

/**
 * Every endpoint in the contract, assembled from the per-domain files.
 *
 * `satisfies Handlers` is the whole safety net: if a domain file is missing a
 * contract key, or returns a shape the schema does not describe, this line
 * fails to compile. The API cannot be deployed half-implemented.
 */
export const handlers = {
  ...identityHandlers,
  ...messagingHandlers,
  ...discoveryHandlers,
  ...commerceHandlers,
  ...advisorHandlers,
  ...onboardingHandlers,
} satisfies Handlers<WorkerContext>;
