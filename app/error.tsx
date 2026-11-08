"use client";

import { useEffect } from "react";

import { ErrorStateScreen } from "@/components/errors/error-state-screen";
import { MobileViewport } from "@/components/mobile/viewport";

/**
 * A page that threw while it rendered: the site's 500, in place of the page,
 * inside the root layout (so the language and the bar are there). "Try
 * again" asks Next to fetch and render the page again (`retry`).
 */
export default function Error({
  error,
  retry,
}: {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <MobileViewport>
      <ErrorStateScreen kind="server" onRetry={retry} />
    </MobileViewport>
  );
}
