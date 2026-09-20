import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AboutScreen } from "@/components/about/about-screen";

/**
 * The route group is `(marketing)`, beside `/landing`: both are public pages a
 * guest lands on, and that group's layout is the bare `MobileViewport` with no
 * `AccessGate` in front of it. `/terms` and `/pdpa` sit in `(auth)` for
 * historical reasons and pass the gate for nothing; this one does not repeat it.
 *
 * The title and description are the page's own rather than the root layout's
 * "Advisory Platform", because this is the one page whose whole job is to say
 * what that name means. They come from the same `about` namespace as the copy, so
 * there is no second place to edit when the positioning changes.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function AboutPage() {
  return <AboutScreen />;
}
