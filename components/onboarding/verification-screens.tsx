"use client";

import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  Hourglass,
  Info,
  RotateCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import { OnboardingSplit } from "@/components/onboarding/frame";
import { Button } from "@/components/ui/button";
import {
  getOwnIdentityVerification,
  type ApiOwnIdentityVerification,
} from "@/lib/api/onboarding";
import { useResource, type Resource } from "@/lib/api/use-resource";
import { advisorLevelTitles } from "@/lib/mock-db/types";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * The review of the signed-in account's ID card
 * (`GET /advisors/me/identity-verification`), which is what decides the
 * outcome; `null` before one has been sent.
 */
function useReview(): Resource<ApiOwnIdentityVerification | null> {
  return useResource<ApiOwnIdentityVerification | null>(
    "advisors/me/identity-verification",
    getOwnIdentityVerification,
  );
}

/** Where the review stands, or `null` with nothing on file. */
function outcomeOf(application: ApiOwnIdentityVerification | null) {
  switch (application?.verificationStatus) {
    case "SUBMITTED":
      return "pending";
    case "REJECTED":
      return "failed";
    case "VERIFIED":
      return "approved";
    default:
      return null;
  }
}

/** A date the way the reader's language writes it: "22 ตุลาคม 2569", "October 22, 2026". */
function useLongDate() {
  const format = useFormatter();
  return (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long" });
}

const MARK_TONES = {
  success: { face: "bg-success-surface text-success", halo: "bg-success-surface/50" },
  accent: { face: "bg-accent-surface text-primary", halo: "bg-accent-surface/60" },
  danger: { face: "bg-destructive/10 text-destructive", halo: "bg-destructive/5" },
  ink: { face: "bg-muted text-foreground", halo: "bg-muted/60" },
} as const;

/** The outcome's mark: its glyph on the tint that goes with it, inside a softer halo. */
function StatusMark({ icon: Icon, tone }: { readonly icon: LucideIcon; readonly tone: keyof typeof MARK_TONES }) {
  return (
    <span aria-hidden className="relative ml-2 flex size-12 shrink-0">
      <span className={cn("absolute -inset-2 rounded-full", MARK_TONES[tone].halo)} />
      <span className={cn("relative flex size-full items-center justify-center rounded-full", MARK_TONES[tone].face)}>
        <Icon className="size-6" />
      </span>
    </span>
  );
}

/**
 * The outcome's words, set as the sign-in pages' heading (`AuthHeading`):
 * 20/24px bold over a 14px grey line, then when it was sent at 12px.
 */
function StatusHeading({
  title,
  body,
  meta,
}: {
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-xl leading-tight font-bold text-foreground md:text-2xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      {meta ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 aria-hidden className="size-3.5 shrink-0" />
          {meta}
        </p>
      ) : null}
    </header>
  );
}

type Stop = {
  readonly key: string;
  readonly title: string;
  readonly detail?: ReactNode;
  readonly state: "done" | "current" | "attention" | "upcoming";
  readonly pill?: { readonly tone: StatusTone; readonly label: string };
  readonly icon?: LucideIcon;
};

const STOP_NODES = {
  done: "bg-success-surface text-success",
  current: "bg-accent-surface text-primary",
  attention: "bg-destructive/10 text-destructive",
  upcoming: "border border-border bg-card text-muted-foreground",
} as const;

const STOP_ICONS: Record<Stop["state"], LucideIcon | null> = {
  done: Check,
  current: Hourglass,
  attention: CircleAlert,
  upcoming: null,
};

/**
 * Where the application has got to, as a short line of stops: what is done in
 * green, what is happening in blue, what needs the applicant in red, what is
 * still ahead in outline. Each stop says its state in words as well.
 */
function StatusTimeline({ stops }: { readonly stops: readonly Stop[] }) {
  return (
    <ol className="flex flex-col rounded-card border border-hero-card-border bg-card p-4 shadow-hero-card">
      {stops.map((stop, i) => {
        const Icon = stop.icon ?? STOP_ICONS[stop.state];
        return (
          <li className="relative flex gap-3 pb-5 last:pb-0" key={stop.key}>
            {i < stops.length - 1 ? (
              <span aria-hidden className="absolute top-9 bottom-1 left-3.5 w-px bg-border" />
            ) : null}
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", STOP_NODES[stop.state])}>
              {Icon ? <Icon aria-hidden className="size-3.5" /> : <span className="size-1.5 rounded-full bg-muted-foreground/50" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    stop.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {stop.title}
                </p>
                {stop.pill ? <StatusPill tone={stop.pill.tone}>{stop.pill.label}</StatusPill> : null}
              </div>
              {stop.detail ? <p className="text-xs text-muted-foreground">{stop.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The outcome's actions, stacked full width as on the sign-in page: the black capsule, then the white. */
function StatusActions({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

const PRIMARY = authPill(true);
const SECONDARY = authPill();

function ActionLink({ href, solid = false, children }: { readonly href: string; readonly solid?: boolean; readonly children: ReactNode }) {
  return (
    <Button
      className={solid ? PRIMARY : SECONDARY}
      nativeButton={false}
      render={<Link href={href} />}
      variant={solid ? "default" : "outline"}
    >
      {children}
    </Button>
  );
}

/** The mark, then the column of what the outcome means and what comes next. */
function StatusBody({ mark, children }: { readonly mark: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 pt-4 md:gap-6 lg:pt-0">
      {mark}
      {children}
    </div>
  );
}

/** Figma "Thank You (Light)" — 995:6579, and its desktop frame (1787:24947). */
export function OnboardingThankYouScreen() {
  const t = useTranslations("advisorOnboarding");
  const date = useLongDate();
  const review = useReview();
  const sentAt = review.data?.submittedAt;

  const next = [
    { icon: Hourglass, title: t("nextReviewTitle"), body: t("nextReviewBody") },
    { icon: Clock3, title: t("nextResultTitle"), body: t("nextResultBody") },
    { icon: Sparkles, title: t("nextStartTitle"), body: t("nextStartBody") },
  ];

  return (
    <OnboardingSplit
      actions={
        <StatusActions>
          <ActionLink href="/advisor-onboarding/pending" solid>
            {t("seeStatus")}
            <ArrowRight aria-hidden />
          </ActionLink>
          <ActionLink href="/profile">{t("backHome")}</ActionLink>
        </StatusActions>
      }
    >
      <StatusBody mark={<StatusMark icon={Check} tone="success" />}>
        <StatusHeading
          body={t("thanksBody")}
          meta={sentAt ? t("thanksMetaAt", { date: date(sentAt) }) : null}
          title={t("thanksTitle")}
        />
        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-foreground">{t("nextTitle")}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-card border border-hero-card-border bg-card shadow-hero-card">
            {next.map(({ icon: Icon, title, body }) => (
              <li className="flex items-start gap-3 px-4 py-3" key={title}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  <Icon aria-hidden className="size-3.5" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </StatusBody>
    </OnboardingSplit>
  );
}

/** Nothing on file yet: say so, and point at the start instead of a status that does not exist. */
function NoApplication() {
  const t = useTranslations("advisorOnboarding");
  return (
    <OnboardingSplit
      actions={
        <StatusActions>
          <ActionLink href="/advisor-onboarding/stage-1" solid>
            {t("start")}
            <ArrowRight aria-hidden />
          </ActionLink>
          <ActionLink href="/advisor/apply">{t("learnMore")}</ActionLink>
        </StatusActions>
      }
    >
      <StatusBody mark={<StatusMark icon={FileText} tone="ink" />}>
        <StatusHeading body={t("noAppBody")} title={t("noAppTitle")} />
      </StatusBody>
    </OnboardingSplit>
  );
}

/** The status could not be read: say what happened and offer the read again. */
function StatusUnavailable({ onRetry }: { readonly onRetry: () => void }) {
  const s = useTranslations("errorStates");
  const t = useTranslations("advisorOnboarding");
  return (
    <OnboardingSplit
      actions={
        <StatusActions>
          <Button className={PRIMARY} onClick={onRetry} type="button">
            <RotateCw aria-hidden />
            {s("retry")}
          </Button>
          <ActionLink href="/profile">{t("backHome")}</ActionLink>
        </StatusActions>
      }
    >
      <StatusBody mark={<StatusMark icon={CircleAlert} tone="danger" />}>
        <StatusHeading body={s("serverBody")} title={s("serverTitle")} />
      </StatusBody>
    </OnboardingSplit>
  );
}

/** Until the review has answered: the shape of the page, not a guess at the outcome. */
function StatusLoading() {
  const t = useTranslations("advisorOnboarding");
  return (
    <OnboardingSplit>
      <div aria-busy className="flex flex-col gap-5 pt-4 md:gap-6 lg:pt-0">
        <span className="sr-only" role="status">
          {t("statusLoading")}
        </span>
        <span className="ml-2 size-12 rounded-full bg-muted" />
        <div className="flex flex-col gap-3">
          <span className="h-9 w-2/3 rounded-lg bg-muted" />
          <span className="h-5 w-full rounded-lg bg-muted" />
        </div>
        <span className="h-48 w-full rounded-card bg-muted" />
      </div>
    </OnboardingSplit>
  );
}

/**
 * Figma "Verification Pending" (995:6703) and "Verification Failed" (995:6658),
 * with their desktop frames (1787:25016, 1787:25101).
 *
 * The screen shows the application's real outcome, whichever route it is on,
 * including an approval, which the frames never drew. With nothing on file it
 * says so and points at the start: a status page for an application that does
 * not exist would be a page of made-up ticks.
 *
 * Only the ID card is reviewed as a pass or a fail (it is what makes the
 * account an advisor), so that is the one stop with an outcome; the details and
 * the proofs are listed as sent, not as approved.
 *
 * `/pending` and `/failed` both render this: the outcome comes from the API,
 * not from the route, so a stale link still lands on the truth.
 */
export function VerificationStatusScreen() {
  const t = useTranslations("advisorOnboarding");
  const date = useLongDate();
  const session = useSession();
  const review = useReview();
  const application = review.data ?? null;
  const outcome = outcomeOf(application);

  if (review.data === undefined && review.error) return <StatusUnavailable onRetry={review.reload} />;
  if (review.data === undefined) return <StatusLoading />;
  if (!application || !outcome) return <NoApplication />;

  const sent: Stop = {
    key: "sent",
    title: t("tlSent"),
    detail: application.submittedAt ? t("thanksMetaAt", { date: date(application.submittedAt) }) : undefined,
    state: "done",
    pill: { tone: "success", label: t("statusSubmitted") },
  };

  if (outcome === "approved") {
    const advisor = session.status === "authenticated" ? session.account.advisor : null;
    return (
      <OnboardingSplit
        actions={
          <StatusActions>
            <ActionLink href="/advisor/services/new" solid>
              {t("createService")}
              <ArrowRight aria-hidden />
            </ActionLink>
            <ActionLink href="/work">{t("goToWork")}</ActionLink>
          </StatusActions>
        }
      >
        <StatusBody mark={<StatusMark icon={Check} tone="success" />}>
          <StatusHeading
            body={
              advisor
                ? t("approvedSubtitle", { level: advisor.level, title: advisorLevelTitles[advisor.level] })
                : t("approvedSubtitleShort")
            }
            title={t("approvedTitle")}
          />
          <StatusTimeline
            stops={[
              sent,
              {
                key: "review",
                title: t("tlIdReview"),
                detail: application.verifiedAt ? t("approvedAt", { date: date(application.verifiedAt) }) : undefined,
                state: "done",
                pill: { tone: "success", label: t("statusApproved") },
              },
              {
                key: "start",
                title: t("tlStart"),
                detail: t("tlStartReady"),
                state: "current",
                icon: Sparkles,
              },
            ]}
          />
        </StatusBody>
      </OnboardingSplit>
    );
  }

  if (outcome === "failed") {
    return (
      <OnboardingSplit
        actions={
          <StatusActions>
            <ActionLink href="/advisor-onboarding/stage-2" solid>
              {t("resubmit")}
              <ArrowRight aria-hidden />
            </ActionLink>
            <ActionLink href="/profile">{t("backHome")}</ActionLink>
          </StatusActions>
        }
      >
        <StatusBody mark={<StatusMark icon={CircleAlert} tone="danger" />}>
          <StatusHeading body={t("failedBody")} title={t("failedHeading")} />
          {/* Figma "Note": the reviewer's own words, the one block on the page
              the applicant has to act on, so it carries the destructive tint. */}
          <section className="flex items-start gap-3 rounded-card border border-destructive/40 bg-destructive/5 px-3.5 py-3">
            <CircleAlert aria-hidden className="mt-0.5 size-4.5 shrink-0 text-destructive" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="text-xs font-medium text-destructive">{t("reviewerNote")}</h2>
              <p className="text-sm text-foreground">
                {application.rejectionReason?.trim() || t("reviewerNoReason")}
              </p>
            </div>
          </section>
          <StatusTimeline
            stops={[
              sent,
              {
                key: "review",
                title: t("tlIdReview"),
                state: "attention",
                pill: { tone: "danger", label: t("statusNeedsFix") },
              },
              {
                key: "again",
                title: t("tlResubmit"),
                detail: t("tlResubmitBody"),
                state: "current",
                icon: RotateCw,
              },
            ]}
          />
        </StatusBody>
      </OnboardingSplit>
    );
  }

  return (
    <OnboardingSplit
      actions={
        <StatusActions>
          <ActionLink href="/profile" solid>
            {t("backHome")}
          </ActionLink>
          <Button className={SECONDARY} onClick={review.reload} type="button" variant="outline">
            <RotateCw aria-hidden />
            {t("checkAgain")}
          </Button>
        </StatusActions>
      }
    >
      <StatusBody mark={<StatusMark icon={Hourglass} tone="accent" />}>
        <StatusHeading body={t("pendingBody")} title={t("pendingHeading")} />
        <StatusTimeline
          stops={[
            sent,
            {
              key: "review",
              title: t("tlIdReview"),
              detail: t("tlIdReviewBody"),
              state: "current",
              pill: { tone: "accent", label: t("statusReviewing") },
            },
            { key: "start", title: t("tlStart"), detail: t("tlStartBody"), state: "upcoming" },
          ]}
        />
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          {t("meanwhile")}
        </p>
      </StatusBody>
    </OnboardingSplit>
  );
}
