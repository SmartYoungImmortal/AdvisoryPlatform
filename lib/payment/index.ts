import { omiseApi, omiseVault } from "@/lib/payment/omise";
import { Card } from "@/lib/payment/types";
import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({});

export function useCreateCardToken() {
  return useMutation({
    mutationFn: async (card: Card) => {
      const { data: omiseData, error: omiseError } = await omiseVault.POST("/tokens", {
        body: { card }
      });

      if (omiseError) {
        throw new Error("Failed to create Omise token");
      }

      return omiseData;

    //   if (omiseData?.id && omiseData?.used === false) {
    //     const { data: backendData, error: backendError } = await backendClient.POST("/token", {
    //       body: { token: omiseData.id },
    //     });

    //     if (backendError) {
    //       throw new Error(backendError.message || "Failed to send token to backend");
    //     }

    //     return backendData;
    //   }

    //   throw new Error("Invalid token data received");
    },
  }, queryClient);
}