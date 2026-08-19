'use client';

import { useCreateCardToken } from "@/lib/payment";
import { Card } from "@/lib/payment/types";

export default function PaymentPage() {
  const { mutate: createToken, isPending, error } = useCreateCardToken();

  const handleCheckout = (cardData: Card) => {
    createToken(cardData, {
      onSuccess: (result) => {
        console.log(result);
      },
      onError: (err) => {
        console.error(err);
      },
    });
  };

  return (
    <form

      onSubmit={(e) => {
        e.preventDefault();

        handleCheckout({
          expiration_month: 2,
          expiration_year: 2029,
          name: "Somchai Prasert",
          number: "4242424242424242",
          security_code: "123",
          street1: "476 Fifth Avenue",
          city: "New York",
          state: "NY",
          postal_code: "10320",
          country: "US",
        });
      }}
    >
      <button disabled={isPending}>
        {isPending ? "Processing..." : "Pay Now"}
      </button>
      {error && <p style={{ color: "red" }}>{error.message}</p>}
    </form>
  );
}
