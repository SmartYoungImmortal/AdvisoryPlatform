import { LegacyRedirect } from "@/components/legal/legacy-redirect";

/**
 * The privacy policy's old address. Deployed, Cloudflare answers it with a 301
 * before this page is ever served (`public/_redirects`); this page is what
 * `next dev` and any host without that file fall back on, so a bookmark or an
 * old link still lands on the policy.
 */
export default function PdpaRedirectPage() {
  return <LegacyRedirect to="/privacy-policy" />;
}
