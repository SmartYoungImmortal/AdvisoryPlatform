/**
 * Google Pay in the browser: Google's own sheet, the card chosen there, and
 * its encrypted token handed to Omise (`createGooglePayToken` in `omise.ts`),
 * which turns it into the same single-use card token a typed card becomes.
 * From there it is a card charge like any other (`POST /payment/checkout`).
 *
 * Omise's rules for the request: the gateway is `omise` with our Omise public
 * key as the merchant id, `PAN_ONLY` as the only way to authenticate, and the
 * networks the account takes (its capability lists JCB, Visa, Mastercard,
 * American Express and UnionPay; Google Pay names the first four).
 *
 * Google's TEST environment until `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID` is set:
 * there the sheet works with no merchant id, and every token it gives Omise is
 * the test card 4111 1111 1111 1111, which an Omise test key charges as paid.
 * Live traffic needs the merchant id from Google's Pay & Wallet Console.
 */

const SCRIPT = "https://pay.google.com/gp/p/js/pay.js";

const MERCHANT_ID = process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID ?? "";

type Environment = "TEST" | "PRODUCTION";

type PaymentData = {
  readonly paymentMethodData: {
    readonly tokenizationData: { readonly token: string };
  };
};

export type GooglePayButtonOptions = {
  readonly onClick: () => void;
  readonly buttonColor?: "default" | "black" | "white";
  readonly buttonType?: "book" | "buy" | "checkout" | "order" | "pay" | "plain";
  readonly buttonSizeMode?: "static" | "fill";
  readonly buttonRadius?: number;
  readonly buttonLocale?: string;
};

export type PaymentsClient = {
  isReadyToPay(request: object): Promise<{ readonly result: boolean }>;
  loadPaymentData(request: object): Promise<PaymentData>;
  createButton(options: GooglePayButtonOptions): HTMLElement;
};

declare global {
  interface Window {
    google?: {
      payments?: {
        api?: { PaymentsClient: new (options: { environment: Environment }) => PaymentsClient };
      };
    };
  }
}

const VERSION = { apiVersion: 2, apiVersionMinor: 0 } as const;

const CARD = {
  type: "CARD",
  parameters: {
    allowedAuthMethods: ["PAN_ONLY"],
    allowedCardNetworks: ["JCB", "VISA", "MASTERCARD", "AMEX"],
  },
} as const;

let loading: Promise<PaymentsClient> | null = null;

/** Google's script and a client for this page, loaded once, the first time a checkout asks. */
export function loadGooglePay(): Promise<PaymentsClient> {
  loading ??= new Promise<PaymentsClient>((resolve, reject) => {
    const make = () => {
      const Client = window.google?.payments?.api?.PaymentsClient;
      if (!Client) {
        loading = null;
        reject(new Error("Google Pay did not load"));
        return;
      }
      resolve(new Client({ environment: MERCHANT_ID ? "PRODUCTION" : "TEST" }));
    };
    if (window.google?.payments?.api) {
      make();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = make;
    script.onerror = () => {
      // Let the next attempt try again rather than keep a failed load.
      loading = null;
      reject(new Error("Google Pay did not load"));
    };
    document.head.append(script);
  });
  return loading;
}

/** Whether this browser can pay with Google Pay at all (a supported browser, signed in or able to add a card). */
export async function googlePayReady(client: PaymentsClient): Promise<boolean> {
  const { result } = await client.isReadyToPay({ ...VERSION, allowedPaymentMethods: [CARD] });
  return result;
}

/**
 * Opens Google's sheet for `amountSatang` and answers the token of the card
 * chosen there, as the JSON string Omise takes. Call it straight from the
 * press of the button: Google only opens the sheet on a user's gesture, so
 * nothing may be awaited before it.
 */
export async function requestGooglePayToken(
  client: PaymentsClient,
  { publicKey, amountSatang, merchantName }: { readonly publicKey: string; readonly amountSatang: number; readonly merchantName: string },
): Promise<string> {
  const data = await client.loadPaymentData({
    ...VERSION,
    allowedPaymentMethods: [
      {
        ...CARD,
        tokenizationSpecification: {
          type: "PAYMENT_GATEWAY",
          parameters: { gateway: "omise", gatewayMerchantId: publicKey },
        },
      },
    ],
    merchantInfo: { merchantName, ...(MERCHANT_ID ? { merchantId: MERCHANT_ID } : {}) },
    transactionInfo: {
      currencyCode: "THB",
      countryCode: "TH",
      totalPriceStatus: "FINAL",
      totalPrice: (amountSatang / 100).toFixed(2),
    },
  });
  return data.paymentMethodData.tokenizationData.token;
}

/** Google's answer when the payer shuts the sheet: not a failure to report. */
export function isGooglePayCancel(cause: unknown): boolean {
  return typeof cause === "object" && cause !== null && "statusCode" in cause && cause.statusCode === "CANCELED";
}
