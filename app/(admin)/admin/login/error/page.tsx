import { CmsLoginScreen } from "@/components/cms/login-screen";

/** The failed-login state, opened with its toast already up. */
export default function AdminLoginErrorPage() {
  return <CmsLoginScreen preset="error" />;
}
