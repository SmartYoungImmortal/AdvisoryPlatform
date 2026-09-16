import { UserDetailScreen } from "@/components/admin/user-detail-screen";
import { adminUsers } from "@/lib/admin/users";

export function generateStaticParams() {
  return adminUsers.map(({ id }) => ({ id }));
}

export default async function UserSuspendedPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserDetailScreen state="suspended" userId={id} />;
}
