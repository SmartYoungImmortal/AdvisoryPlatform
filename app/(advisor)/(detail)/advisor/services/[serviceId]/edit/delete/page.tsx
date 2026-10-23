import { ServiceFormScreen } from "@/components/advisor-services/service-form-screen";
import { ADVISOR_SERVICE_IDS } from "@/lib/advisor-services";

export function generateStaticParams() {
  return ADVISOR_SERVICE_IDS.map((serviceId) => ({ serviceId }));
}

export default async function DeleteServicePage({
  params,
}: {
  readonly params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  return <ServiceFormScreen mode="edit" serviceId={serviceId} state="delete" />;
}
