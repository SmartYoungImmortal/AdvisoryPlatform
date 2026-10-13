"use client";

import { PaymentResultScreen } from "@/components/payment/payment-result-screens";
import { LoadingScreen } from "@/components/payment/loading-screen";
import { $api } from "@/lib/api/v1/api";
import { PaymentConfig } from "@/lib/payment/config";
import { notFound, useSearchParams } from "next/navigation";

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get(PaymentConfig.urlParams.invoiceId);
  if (!invoiceId) notFound();

  const {
    data: data,
    error: error,
    isLoading: invoiceLoading,
  } = $api.useQuery("get", "/api/v1/payment/invoice/{id}/paymentStatus", {
    params: {
      path: {
        id: invoiceId,
      },
    },
    credentials: "include",
  });

  if (!data || invoiceLoading) return <LoadingScreen />;
  if (error) throw new Error(`An error occured: ${error.message}`);

  if (!data?.data) notFound();

  return <PaymentResultScreen state="success" statusData={data.data} />;
}
