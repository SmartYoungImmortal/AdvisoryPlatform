import { AdvisorServiceDetailScreen } from "@/components/advisor-services/advisor-service-detail-screen";
import { ADVISOR_SERVICE_IDS } from "@/lib/advisor-services";

export function generateStaticParams() {
  return ADVISOR_SERVICE_IDS.map((serviceId) => ({ serviceId }));
}

export default async function AdvisorServiceDetailPage({
  params,
}: {
  readonly params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  return <AdvisorServiceDetailScreen serviceId={serviceId} />;
}
