"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Sends an old address on to its new one. `replace`, not `push`, so the old
 * address does not stay in the history for Back to bounce off. The link is for
 * the moment before the script runs, and for a reader without it.
 */
export function LegacyRedirect({ to }: { readonly to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <p className="p-6 text-sm text-muted-foreground">
      <Link className="font-semibold text-foreground underline underline-offset-2" href={to}>
        {to}
      </Link>
    </p>
  );
}
