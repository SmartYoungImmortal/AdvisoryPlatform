"use client";

import { LoadingScreen } from "@/components/payment/loading-screen";
import { MethodSelection } from "@/components/payment/method-selection";
import { $api } from "@/lib/api/v1/api";
import { PaymentConfig } from "@/lib/payment/config";
import { notFound, useSearchParams } from "next/navigation";

export default function CardDetailsPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get(PaymentConfig.urlParams.invoiceId);
  if (!invoiceId) notFound();

  const { data, error, isLoading } = $api.useQuery('get', '/api/v1/payment/invoice/{id}', {
    params: {
      path: {
        id: invoiceId,
      }
    },
    credentials: 'include'
  })

  if (!data || isLoading) return <LoadingScreen />;
  if (error) return `An error occured: ${error.message}`;

  if (!data?.data) notFound();


  return <MethodSelection invoice={data.data} />;
}
