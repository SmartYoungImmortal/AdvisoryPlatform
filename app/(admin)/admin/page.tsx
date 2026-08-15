import { AdminLoginScreen } from "@/components/admin/admin-login-screen";

/**
 * Mirrors Nexus's behaviour where an unauthenticated hit on `/admin` redirects to
 * the login screen — in this static prototype `/admin` simply renders it.
 */
export default function AdminIndexPage() {
  return <AdminLoginScreen />;
}
