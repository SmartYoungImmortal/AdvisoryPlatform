"use client";

// The story's face (`font-story`), loaded where it is used, as `/about` does.
import "@fontsource/prompt/600.css";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AUTH_LINK, authPill } from "@/components/auth/auth-split";
import { HeroSearch } from "@/components/home/hero-search";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorKind = "no-connection" | "not-found" | "server";

type Copy = Parameters<ReturnType<typeof useTranslations<"errorStates">>>[0];

/**
 * Each state's mark (its code, or the English word where it has none, in
 * both languages, as the codes are), its title and its line.
 */
const SPEC: Record<ErrorKind, { readonly mark: string; readonly title: Copy; readonly body: Copy }> = {
  "not-found": { mark: "404", title: "notFoundTitle", body: "notFoundBody" },
  server: { mark: "500", title: "serverTitle", body: "serverBody" },
  "no-connection": { mark: "Offline", title: "offlineTitle", body: "offlineBody" },
};

/** The site's search field as `/search` sets it on white, with its suggestions. */
function PageSearch() {
  const t = useTranslations("home");
  const c = useTranslations("common");
  return (
    <HeroSearch
      categories={[
        t("categoryBusiness"),
        t("categoryFinance"),
        t("categoryLegal"),
        t("categoryEducation"),
        t("categoryWellbeing"),
      ]}
      examples={[t("searchExample1"), t("searchExample2"), t("searchExample3"), t("searchExample4"), t("searchExample5")]}
      placeholder={t("searchPlaceholder")}
      submitLabel={c("search")}
      typing={false}
      variant="page"
    />
  );
}

/**
 * The page nothing else could be shown on: a page not found, the server
 * failing, the connection gone.
 *
 * Words only, in the middle of the window under the bar, with no footer: the
 * code set very large in the story's type and the logo's blue gradient (a
 * word where there is no code), the title under it, its line in grey, then
 * the one thing to do. A page not found offers the site's search; a failed
 * server and a lost connection, asking again as the navy capsule. The way
 * home is a quiet link under it all.
 *
 * `onRetry` asks again; without one, the page reloads.
 */
export function ErrorStateScreen({ kind, onRetry }: { readonly kind: ErrorKind; readonly onRetry?: () => void }) {
  const t = useTranslations("errorStates");
  const c = useTranslations("common");
  const spec = SPEC[kind];
  const retry = onRetry ?? (() => window.location.reload());

  return (
    <MobileScreen className="bg-card" wide>
      <ScreenTopBar className="lg:hidden" href="/" label={c("back")} />
      <ScreenBody className="bg-card">
        <div className="hidden w-full lg:block">
          <TopBar />
        </div>

        <section className="flex w-full flex-1 flex-col items-center justify-center px-6 pb-16 text-center md:px-12 lg:pb-24">
          <div className="flex w-full flex-col items-center">
            {/* `py`: room inside the gradient's box for Thai's stacked marks, which would otherwise draw outside it, transparent. */}
            <p
              aria-hidden
              className={cn(
                "bg-logo-gradient bg-clip-text py-[0.12em] font-story leading-none font-semibold tracking-tight text-transparent",
                kind === "no-connection" ? "text-6xl md:text-7xl" : "text-8xl md:text-9xl",
              )}
            >
              {spec.mark}
            </p>
            <h1 className="mt-4 font-story text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {t(spec.title)}
            </h1>
            {/* One line from `lg`, in either language; wrapped on a phone. */}
            <p className="mt-2 max-w-md text-sm text-pretty text-muted-foreground md:text-base lg:max-w-none lg:whitespace-nowrap">
              {t(spec.body)}
            </p>

            {kind === "not-found" ? (
              <div className="mt-8 flex w-full max-w-108 text-left">
                <PageSearch />
              </div>
            ) : (
              <Button className={cn(authPill(true), "mt-8 w-auto px-8")} onClick={retry} type="button">
                {t("retry")}
              </Button>
            )}

            <Link className={cn(AUTH_LINK, "mt-6 text-sm font-medium")} href="/">
              {t("backHome")}
            </Link>
          </div>
        </section>
      </ScreenBody>
    </MobileScreen>
  );
}
