import { ServiceScheduleScreen } from "@/components/advisor-services/service-schedule-screen";
import { ADVISOR_SERVICE_IDS } from "@/lib/advisor-services";

export function generateStaticParams() {
  return ADVISOR_SERVICE_IDS.map((serviceId) => ({ serviceId }));
}

export default async function ServiceSchedulePage({
  params,
}: {
  readonly params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  return <ServiceScheduleScreen serviceId={serviceId} />;
}
