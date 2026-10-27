import { AccountSettingsScreen } from "@/components/profile/account-settings-screen";
import { LogOutDialog } from "@/components/profile/log-out-dialog";

export default function LogOutConfirmPage() {
  // Logging out lives in the settings now, so the confirm sits over them and
  // cancelling goes back there.
  return <AccountSettingsScreen overlay={<LogOutDialog cancelHref="/settings" />} />;
}
