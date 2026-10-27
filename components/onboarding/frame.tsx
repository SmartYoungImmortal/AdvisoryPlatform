"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { LanguageSwitch } from "@/components/topbar";
import { logo } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * The advisor application's frame, from the first stage to the outcome.
 *
 * The sign-in pages' shape (`AuthSplit`): on a desktop the home hero's room
 * photograph holds the left half and the application sits on white in the
 * right; below `lg`, the application alone. Built beside that frame rather
 * than on it, because its column is the 400px a sign-in form wants and an
 * application with a document upload needs about 600.
 *
 * `actions` is the stage's back / next pair. On the phone and the portrait
 * tablet it stays pinned to the bottom of the screen while the form scrolls
 * under it; on a desktop it follows the form.
 */
export function OnboardingSplit({
  children,
  actions,
}: {
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    // `"md"`: one column, so a portrait tablet gets the full width with the
    // column centred rather than a phone strip between grey margins.
    <MobileScreen className="bg-card pb-0" wide="md">
      <ScreenBody className="bg-card lg:grid lg:grid-cols-2 lg:items-start">
        {/* Held in view while a long stage scrolls past it: the room is the
            one constant through the whole application. */}
        <aside
          aria-hidden
          className="sticky top-3 m-3 hidden h-[calc(100dvh-1.5rem)] overflow-hidden rounded-3xl bg-hero-ground lg:block"
        >
          <div className="absolute inset-0 bg-hero-photo bg-[length:auto_140%] bg-[position:30%_88%] bg-no-repeat" />
        </aside>
        <div className="flex min-h-dvh w-full flex-col">
          <header className="flex h-16 w-full shrink-0 items-center justify-between gap-4 px-6 lg:px-12">
            <Link className="inline-flex shrink-0" href="/">
              <Image alt="Advisory" className="h-6 w-auto" src={logo} />
            </Link>
            <LanguageSwitch className="inline-flex" />
          </header>
          {/* Centred as a group on a desktop, so a short stage sits in the
              middle of the half instead of under the header. */}
          <div className="flex w-full flex-1 flex-col lg:justify-center">
            {/* The sign-in pages' column: 400px, zoomed down with the screen
                from 1710 on a landscape tablet (`auth-scale`). */}
            <div className="auth-scale mx-auto flex w-full max-w-100 flex-col px-6 pb-8 md:px-0 lg:pb-0">
              {children}
            </div>
            {actions ? (
              <div className="sticky bottom-0 z-10 mt-auto w-full border-t border-border bg-card/95 backdrop-blur-sm lg:static lg:mt-0 lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
                <div className="auth-scale mx-auto w-full max-w-100 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-0 lg:pt-6 lg:pb-12">
                  {actions}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * The page's title and the line under it, set exactly as the sign-in pages'
 * heading (`AuthHeading`): 20/24px bold over a 14px grey line.
 */
export function StageHeading({
  title,
  lead,
  className,
}: {
  readonly title: ReactNode;
  readonly lead?: ReactNode;
  readonly className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-1.5", className)}>
      <h1 className="text-xl leading-tight font-bold text-foreground md:text-2xl">{title}</h1>
      {lead ? <p className="text-sm text-muted-foreground">{lead}</p> : null}
    </header>
  );
}

const STAGES = [
  { step: 1, href: "/advisor-onboarding/stage-1", label: "stepPersonal" },
  { step: 2, href: "/advisor-onboarding/stage-2", label: "stepDocument" },
  { step: 3, href: "/advisor-onboarding/stage-3", label: "stepSkills" },
] as const;

/** The sliver a stage's bar shows the moment it is reached, before anything is filled in. */
const STARTED = 0.06;

/**
 * One stage's bar, filled to the share it stands at. When an answer changes
 * the share, the fill catches up in a short transition: feedback on the
 * answer, not an entrance.
 */
function StageBar({ value }: { readonly value: number }) {
  return (
    <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <span
        className="absolute inset-0 origin-left rounded-full bg-primary transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${value})` }}
      />
    </span>
  );
}

/**
 * The three stages, named by what each asks for, with a bar under each.
 *
 * The bars are honest about where the applicant is: a finished stage is full,
 * the current one fills as its required answers become valid (`progress`), and
 * the ones ahead are empty. A finished stage is a link back to it; the drafts
 * live in this tab, so nothing is lost by going back.
 */
export function ApplicationStepper({
  step,
  progress,
}: {
  readonly step: 1 | 2 | 3;
  /** How much of the current stage is done, 0 → 1. */
  readonly progress: number;
}) {
  const t = useTranslations("advisorOnboarding");

  return (
    <nav aria-label={t("stepsLabel")} className="w-full">
      <p className="sr-only">{t("stepOf", { n: step })}</p>
      <ol className="grid w-full grid-cols-3 gap-2 md:gap-3">
        {STAGES.map((stage) => {
          const done = stage.step < step;
          const current = stage.step === step;
          let value = 0;
          if (done) value = 1;
          else if (current) value = Math.max(STARTED, Math.min(1, progress));
          const body = (
            <>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs leading-tight md:text-sm",
                  current && "font-semibold text-foreground",
                  done && "font-medium text-foreground",
                  !current && !done && "text-muted-foreground",
                )}
              >
                {done ? <Check aria-hidden className="size-3.5 shrink-0 text-primary" /> : null}
                <span className="truncate">{t(stage.label)}</span>
              </span>
              <StageBar value={value} />
            </>
          );
          return (
            <li aria-current={current ? "step" : undefined} key={stage.step}>
              {done ? (
                <Link
                  className="group flex min-h-11 flex-col justify-end gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  href={stage.href}
                >
                  {body}
                  <span className="sr-only">{t("stepDone")}</span>
                </Link>
              ) : (
                <div className="flex min-h-11 flex-col justify-end gap-2">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
