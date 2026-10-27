"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { LanguageSwitch } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { SOCIAL_PROVIDERS, signInSocial, type SocialProvider } from "@/lib/api/auth";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import { brandMarks, logo } from "@/lib/assets/r2";
import { safeNext } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * The sign-in and sign-up pages' shared frame: on a desktop the home hero's
 * room photograph holds the left half and the form sits flat on white in the
 * right; below `lg` the form alone, in one centred column.
 *
 * `wide="md"`: from the tablet up the page is the full width, white to the
 * edges with the column centred, instead of a phone-width strip on grey. The
 * photograph half still waits for `lg`, a landscape tablet.
 */
export function AuthSplit({ children }: { readonly children: ReactNode }) {
  return (
    <MobileScreen className="bg-card" wide="md">
      {/* `items-stretch`: `ScreenBody` centres its children, which left the
          photograph half, having no content of its own in flow, 0px tall. */}
      <ScreenBody className="bg-card lg:grid lg:grid-cols-2 lg:items-stretch">
        <aside aria-hidden className="relative m-3 hidden overflow-hidden rounded-3xl bg-hero-ground lg:block">
          {/* Closer in than the home hero: the room is a landscape frame, and
              fitted to a portrait half it gave the top half to a bare wall
              and cut the chair off at the edge. At this size the half holds
              the corner of the desk, the frame, the plant and the chair. */}
          <div className="absolute inset-0 bg-hero-photo bg-[length:auto_140%] bg-[position:30%_88%] bg-no-repeat" />
        </aside>
        <div className="relative flex min-h-full w-full flex-col px-6 lg:px-12">
          {/* These pages have no bar, so the language switch they would
              otherwise lack sits in the form half's top corner. */}
          <LanguageSwitch className="absolute top-4 right-4 inline-flex lg:top-6 lg:right-8" />
          {/* `auth-scale` (`app/globals.css`): the column zoomed down with the
              screen from 1710 on a landscape tablet. */}
          <section className="auth-scale mx-auto flex w-full max-w-100 flex-1 flex-col justify-center gap-5 py-8 md:gap-6 md:py-12">
            {children}
          </section>
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * The page's heading: a sentence that the wordmark ends ("welcome to
 * [Advisory]"), the wordmark also the way home, and the grey line under it.
 * The logo's alt text keeps the heading a whole sentence for a screen reader.
 */
export function AuthHeading({
  title,
  withLogo = false,
  subtitle,
  centred = false,
}: {
  readonly title: ReactNode;
  readonly withLogo?: boolean;
  readonly subtitle?: ReactNode;
  /** Centred over the column below `lg`, under an `AuthMark`. */
  readonly centred?: boolean;
}) {
  return (
    <header className={cn("flex flex-col gap-1.5", centred && "items-center text-center lg:items-start lg:text-left")}>
      <h1
        className={cn(
          "flex flex-wrap items-center gap-x-2.5 text-xl leading-tight font-bold text-foreground md:text-2xl",
          centred && "justify-center lg:justify-start",
        )}
      >
        {title}
        {withLogo ? (
          <Link className="inline-flex shrink-0" href="/">
            <Image alt="Advisory" className="h-6 w-auto md:h-7.5" priority src={logo} />
          </Link>
        ) : null}
      </h1>
      {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
    </header>
  );
}

/**
 * The round mark a status page opens with (sent, verified, an expired link).
 * Below `lg` it stands centred over the column with its heading (`centred`),
 * as a phone's confirmation does; from `lg` both line up with the form
 * pages' left edge, beside the photograph.
 */
export function AuthMark({ children }: { readonly children: ReactNode }) {
  return (
    <span className="flex size-14 items-center justify-center self-center rounded-full bg-muted lg:self-start">
      {children}
    </span>
  );
}

/**
 * The two button shapes, both fully round like every action on the home page:
 * the solid one is the home hero's black, the other a white pill on a
 * hairline. A size down on the phone, where 48px pills in 16px type crowded
 * the screen; the full size from the tablet up.
 */
export function authPill(solid = false) {
  return cn(
    "h-11 w-full gap-2 rounded-full px-5 text-sm font-medium md:h-12 md:gap-2.5 md:px-6 md:text-base [&_svg:not([class*='size-'])]:size-4.5 md:[&_svg:not([class*='size-'])]:size-5",
    solid
      ? "border-0 bg-hero-action text-hero-action-foreground hover:bg-hero-action/85 disabled:bg-muted-foreground disabled:opacity-100"
      : "border border-border bg-card text-foreground hover:bg-muted",
  );
}

/** The underlined 600-weight link both pages use in their running text. */
export const AUTH_LINK = "font-semibold text-foreground underline underline-offset-2";

export const PROVIDER_NAMES: Readonly<Record<SocialProvider, string>> = {
  google: "Google",
  facebook: "Facebook",
  apple: "Apple",
};

/** Why a social button did not leave the page. */
export type SocialFailure =
  /** A provider the API has not been given credentials for. */
  | { readonly kind: "off"; readonly provider: string }
  | { readonly kind: "unreachable" }
  | { readonly kind: "failed"; readonly detail: string | null };

/**
 * Each provider's button, then a rule with "or" on it, for the form that
 * follows. A press sends the browser to the provider's own consent page
 * through better-auth (Google opens on its account chooser); signing up and
 * signing in are the same journey there, which is why both pages carry it.
 *
 * The API switches each provider on from its own env; one still off answers
 * `PROVIDER_NOT_FOUND`, reported as `off` so the page can say "not available
 * yet, use email" rather than show an error. Draws nothing when
 * `NEXT_PUBLIC_AUTH_SOCIAL` narrows the list to none.
 */
export function SocialButtons({
  onFailure,
  disabled = false,
  compact = false,
  divider,
}: {
  readonly onFailure: (failure: SocialFailure | null) => void;
  readonly disabled?: boolean;
  /**
   * One row of three, each the mark and the provider's name, for a page
   * where the form below is the main event (sign-up): three full-width
   * pills over five fields made the providers the page.
   */
  readonly compact?: boolean;
  /** The word on the rule; "or" by default. */
  readonly divider?: string;
}) {
  const t = useTranslations("login");
  const [busy, setBusy] = useState(false);

  async function start(provider: SocialProvider) {
    if (busy) return;
    onFailure(null);
    setBusy(true);
    try {
      const next = new URLSearchParams(window.location.search).get("next");
      const { url } = await signInSocial({
        provider,
        callbackURL: `${window.location.origin}${safeNext(next) ?? "/"}`,
      });
      if (url) {
        window.location.assign(url);
        return;
      }
      onFailure({ kind: "failed", detail: null });
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "PROVIDER_NOT_FOUND") {
        onFailure({ kind: "off", provider: PROVIDER_NAMES[provider] });
      } else if (cause instanceof ApiUnreachableError) {
        onFailure({ kind: "unreachable" });
      } else {
        onFailure({ kind: "failed", detail: cause instanceof Error ? cause.message : null });
      }
    }
    setBusy(false);
  }

  if (SOCIAL_PROVIDERS.length === 0) return null;

  return (
    <>
      <div className={compact ? "grid grid-cols-3 gap-2" : "flex flex-col gap-2"}>
        {SOCIAL_PROVIDERS.map((provider) => {
          const label = t("continueWith", { provider: PROVIDER_NAMES[provider] });
          return (
            <Button
              aria-busy={busy || undefined}
              // The compact label is the name alone; the full sentence stays
              // what a screen reader hears.
              aria-label={compact ? label : undefined}
              className={cn(authPill(), compact && "px-2 md:px-3")}
              disabled={busy || disabled}
              key={provider}
              onClick={() => void start(provider)}
              type="button"
              variant="outline"
            >
              <Image alt="" className="size-5" src={brandMarks[provider]} />
              {compact ? PROVIDER_NAMES[provider] : label}
            </Button>
          );
        })}
      </div>
      {/* A rule either side of the word: the routes above and below are
          alternatives, not steps. */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {divider ?? t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
