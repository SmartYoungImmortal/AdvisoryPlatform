import { UserEditScreen } from "@/components/cms/screens/user-edit";

/** `/admin/users/edit?id=…` — a query string, because the export cannot prerender every id. */
export default function AdminUserEditPage() {
  return <UserEditScreen />;
}
