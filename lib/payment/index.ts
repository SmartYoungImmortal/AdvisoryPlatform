import { queryClient } from "@/lib/api/client";
import { api } from "@/lib/api/v1/api";
import { omiseVault } from "@/lib/payment/omise";
import { Card } from "@/lib/payment/types";
import { useMutation } from "@tanstack/react-query";

export function useCreateCardToken() {
  return useMutation(
    {
      mutationFn: async ({
        card,
        invoiceId,
      }: {
        card: Card;
        invoiceId: string;
      }) => {
        const { data: tokenData, error: tokenError } = await omiseVault.POST(
          "/tokens",
          {
            body: { card },
          },
        );

        if (tokenError || !tokenData.id) {
          throw new Error("Failed to create Omise token");
        }

        if (!tokenData?.id || tokenData?.used !== false) {
          throw new Error("Invalid token data received");
        }

        const { data: checkoutData, error: checkoutError } = await api.POST(
          "/api/v1/payment/checkout",
          {
            body: {
              invoiceId,
              cardToken: tokenData.id,
            },
            credentials: "include",
          },
        );

        if (checkoutError || !checkoutData.data?.url) {
          throw new Error(
            checkoutError?.message || "Failed to send token to backend",
          );
        }

        return checkoutData.data.url;
      },
    },
    queryClient,
  );
}
