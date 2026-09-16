import { notFound } from "next/navigation";

import { ServiceFormScreen } from "@/components/advisor-services/service-form-screen";
import { ADVISOR_SERVICE_IDS, advisorService } from "@/lib/advisor-services";

export function generateStaticParams() {
  return ADVISOR_SERVICE_IDS.map((serviceId) => ({ serviceId }));
}

export default async function EditServicePage({
  params,
}: {
  readonly params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const record = advisorService(serviceId);
  if (!record) notFound();
  return <ServiceFormScreen mode="edit" record={record} />;
}
