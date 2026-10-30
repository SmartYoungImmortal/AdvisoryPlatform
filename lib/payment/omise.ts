/**
 * Omise.js in the browser: a card becomes a single-use token (`tokn_…`) here,
 * in Omise's own script, so the card's number and code never reach our
 * servers — the API only ever sees the token, and charges it.
 *
 * The script is loaded once, when the checkout first asks for it, against the
 * API's public key (`GET /payment/public-key`), so the key lives in one place:
 * the API's environment.
 */

const SCRIPT = "https://cdn.omise.co/omise.js";

/** The card as Omise's `createToken` takes it. */
export type OmiseCard = {
  readonly name: string;
  readonly number: string;
  readonly expiration_month: number;
  readonly expiration_year: number;
  readonly security_code: string;
  /** The billing address's postcode, and its country as ISO 3166 alpha-2. */
  readonly postal_code?: string;
  readonly country?: string;
};

type OmiseTokenResponse = {
  readonly object: string;
  readonly id?: string;
  readonly code?: string;
  readonly message?: string;
};

/** A wallet's encrypted card, as Omise's `createToken("tokenization", …)` takes it. */
type OmiseTokenization = {
  readonly method: "googlepay";
  /** The wallet's token, the JSON string it answered. */
  readonly data: string;
};

type OmiseGlobal = {
  setPublicKey(key: string): void;
  createToken(
    kind: "card",
    card: OmiseCard,
    callback: (status: number, response: OmiseTokenResponse) => void,
  ): void;
  createToken(
    kind: "tokenization",
    tokenization: OmiseTokenization,
    callback: (status: number, response: OmiseTokenResponse) => void,
  ): void;
};

declare global {
  interface Window {
    Omise?: OmiseGlobal;
  }
}

let loading: Promise<OmiseGlobal> | null = null;

function loadScript(): Promise<OmiseGlobal> {
  loading ??= new Promise<OmiseGlobal>((resolve, reject) => {
    if (window.Omise) {
      resolve(window.Omise);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.Omise ? resolve(window.Omise) : reject(new Error("Omise.js did not load")));
    script.onerror = () => {
      // Let the next attempt try again rather than keep a failed load.
      loading = null;
      reject(new Error("Omise.js did not load"));
    };
    document.head.append(script);
  });
  return loading;
}

/** A card's token, or the message Omise rejected it with (an expired card, a wrong number). */
export async function createCardToken(publicKey: string, card: OmiseCard): Promise<string> {
  const omise = await loadScript();
  omise.setPublicKey(publicKey);
  return new Promise((resolve, reject) => {
    omise.createToken("card", card, (status, response) => {
      if (status === 200 && response.id) resolve(response.id);
      else reject(new Error(response.message ?? response.code ?? "card rejected"));
    });
  });
}

/**
 * The card chosen in Google Pay as the same single-use card token, from the
 * wallet's encrypted token (`lib/payment/google-pay.ts`). Charged like a typed
 * card; Omise only adds `tokenization_method: "googlepay"` to it.
 */
export async function createGooglePayToken(publicKey: string, data: string): Promise<string> {
  const omise = await loadScript();
  omise.setPublicKey(publicKey);
  return new Promise((resolve, reject) => {
    omise.createToken("tokenization", { method: "googlepay", data }, (status, response) => {
      if (status === 200 && response.id) resolve(response.id);
      else reject(new Error(response.message ?? response.code ?? "Google Pay rejected"));
    });
  });
}
