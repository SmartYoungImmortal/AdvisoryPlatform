import { api } from "@/lib/api/client";

/** `MatchingResponseDto`: the services that fit a problem, best first. */
export interface ApiMatching {
  /** `ai` when a model read the problem; `keyword` when its words were matched. */
  readonly mode: "ai" | "keyword";
  /** One sentence restating the need; `null` in keyword mode. */
  readonly understanding: string | null;
  readonly topics: readonly string[];
  readonly matches: readonly {
    readonly serviceId: string;
    /** Why it fits, in the problem's language; `null` in keyword mode. */
    readonly reason: string | null;
    /** The problem's words found in the service; empty when a model chose it. */
    readonly matched: readonly string[];
  }[];
}

/**
 * `POST /matching` — public. A POST so the problem, which can be private,
 * travels in the body rather than in a URL.
 */
export function matchServices(
  input: { readonly problem: string; readonly categoryId?: string; readonly maxPriceSatang?: number },
  signal?: AbortSignal,
): Promise<ApiMatching> {
  return api.post("matching", { body: input, signal });
}

/** `GET /matching/status` — whether a model reads the problems. */
export function getMatchingStatus(signal?: AbortSignal): Promise<{ readonly ai: boolean }> {
  return api.get("matching/status", { signal });
}
