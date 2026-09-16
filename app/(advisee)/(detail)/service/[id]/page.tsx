import { ServiceDetailScreen } from "@/components/service/service-detail-screen";
import { serviceIds } from "@/lib/catalogue/services";

export function generateStaticParams() {
  return serviceIds.map((id) => ({ id }));
}

export default async function ServicePage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ServiceDetailScreen serviceId={id} />;
}
