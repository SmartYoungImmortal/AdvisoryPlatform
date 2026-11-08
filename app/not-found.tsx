import { ErrorStateScreen } from "@/components/errors/error-state-screen";
import { MobileViewport } from "@/components/mobile/viewport";

/**
 * Any address that is no page of the site: the site's own 404, in the mobile
 * frame. The static export writes it as `404.html`, which the Worker's assets
 * serve for every path they do not have (`not_found_handling` in
 * `wrangler.jsonc`).
 */
export default function NotFound() {
  return (
    <MobileViewport>
      <ErrorStateScreen kind="not-found" />
    </MobileViewport>
  );
}
