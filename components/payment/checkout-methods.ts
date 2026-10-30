import type { CardPayment, PayMethod } from "./checkout-parts";
import type { GooglePayment } from "./checkout-googlepay";
import type { MobileBanking } from "./checkout-mobile-banking";
import type { PromptPayment } from "./checkout-promptpay";

/**
 * The four ways to pay side by side, for the wide page and the phone's steps
 * to ask the chosen one the same questions.
 */
export type Payments = {
  readonly payment: CardPayment;
  readonly promptPay: PromptPayment;
  readonly googlePay: GooglePayment;
  readonly mobileBanking: MobileBanking;
};

/**
 * What the chosen way to pay is doing, what went wrong with it, which
 * message its button shows while it works, and whether it is ready to press.
 */
export function methodState(method: PayMethod, { payment, promptPay, googlePay, mobileBanking }: Payments) {
  switch (method) {
    case "card":
      return { working: payment.paying, problem: payment.problem, workingLabel: "payWorking", ready: payment.ready !== null } as const;
    case "googlepay":
      return { working: googlePay.paying, problem: googlePay.problem, workingLabel: "payWorking", ready: googlePay.ready } as const;
    case "mobilebanking":
      return {
        working: mobileBanking.paying,
        problem: mobileBanking.problem,
        workingLabel: "mobileBankingWorking",
        ready: mobileBanking.bank !== null,
      } as const;
    default:
      return { working: promptPay.starting, problem: promptPay.problem, workingLabel: "payWorking", ready: true } as const;
  }
}

/** What pressing the pay button does for the chosen way to pay; Google Pay has its own button. */
export function payWith(method: PayMethod, { payment, promptPay, mobileBanking }: Payments): () => void {
  if (method === "card") return payment.pay;
  if (method === "mobilebanking") return mobileBanking.pay;
  return promptPay.start;
}
