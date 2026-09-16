import { LogOutDialog } from "@/components/profile/log-out-dialog";
import { ProfileScreen } from "@/components/profile/profile-screen";

export default function LogOutConfirmPage() {
  return <ProfileScreen overlay={<LogOutDialog />} variant="logout" />;
}
