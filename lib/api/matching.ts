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
    /**
     * The package of the service that suits the problem, when the answer
     * names one; absent from an API that does not, when the page suggests one
     * from `matched` itself.
     */
    readonly packageId?: string | null;
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

/** One line of a matching conversation, as `POST /matching/chat` reads it. */
export interface ApiMatchingMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

/** `MatchingChatResponseDto`: the assistant's next line, and what it found. */
export interface ApiMatchingChat {
  readonly mode: "ai" | "keyword";
  /** What the assistant says next; may be empty in keyword mode. */
  readonly reply: string;
  /** `null` when the assistant asked a question instead of searching. */
  readonly search: {
    readonly title: string;
    readonly topics: readonly string[];
    readonly matches: ApiMatching["matches"];
  } | null;
  /** Short replies the person can tap to narrow the search. */
  readonly suggestions: readonly string[];
}

/**
 * `POST /matching/chat` — public. The whole conversation so far, last line the
 * person's; the answer either asks one question or searches.
 */
export function chatMatching(
  messages: readonly ApiMatchingMessage[],
  signal?: AbortSignal,
): Promise<ApiMatchingChat> {
  return api.post("matching/chat", { body: { messages }, signal });
}

/** `GET /matching/status` — whether a model reads the problems. */
export function getMatchingStatus(signal?: AbortSignal): Promise<{ readonly ai: boolean }> {
  return api.get("matching/status", { signal });
}
