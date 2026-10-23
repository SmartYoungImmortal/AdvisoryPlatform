import { AdvisorPublicProfileScreen } from "@/components/advisor-public/advisor-public-profile-screen";
import { profileAdvisorIds } from "@/lib/catalogue/profiles";

export function generateStaticParams() {
  return profileAdvisorIds.map((advisorId) => ({ advisorId }));
}

export default async function AdvisorProfileReviewsPage({
  params,
}: {
  readonly params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  return <AdvisorPublicProfileScreen advisorId={advisorId} tab="reviews" />;
}
