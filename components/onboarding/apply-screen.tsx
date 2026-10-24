"use client";

import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CalendarDays,
  FileBadge,
  Hourglass,
  IdCard,
  Info,
  Landmark,
  LockKeyhole,
  MessageSquareText,
  MessagesSquare,
  PencilLine,
  ShieldCheck,
  Tags,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { getOwnAdvisorProfile, type ApiOwnAdvisorProfile } from "@/lib/api/onboarding";
import { useResource } from "@/lib/api/use-resource";
import { serviceContractMeeting, serviceInterviewPractice } from "@/lib/assets/r2";
import { useSession } from "@/lib/session";
import { useOnboardingDraft } from "@/lib/session/onboarding";
import { cn } from "@/lib/utils";

/*
 * A calm scale in the 1710 frame the desktop page is drawn in (`doc-scale`
 * zooms it down from there): 16px body, 36px section titles, the sign-in
 * pages' 48px capsules.
 */

/** Section headings: the hero's Kanit, a step down from the page title. */
const H2 = "font-hero text-3xl leading-tight font-normal tracking-tight text-hero-ink md:text-4xl";
const LEAD = "text-base text-muted-foreground";

/** The hand-lettered word in the title (`t.rich`'s `<hand>`). */
function handWord(chunks: ReactNode) {
  return <span className="ms-1.5 font-hand">{chunks}</span>;
}
/** The page's 1200 column, with the gutters `/search` uses at each width. */
const COLUMN = "mx-auto w-full max-w-300 px-5 md:px-20 lg:px-8";

/**
 * The signed-in account's application (`GET /advisors/me`), counted only once
 * an ID card is in: a profile left at `NONE` is an application still being
 * filled in, so "start" carries on with it rather than showing a status.
 */
function useLatestApplication(): ApiOwnAdvisorProfile | null {
  const own = useResource<ApiOwnAdvisorProfile | null>("advisors/me", getOwnAdvisorProfile);
  return own.data && own.data.verificationStatus !== "NONE" ? own.data : null;
}

type Next = {
  readonly href: string;
  readonly label: string;
  readonly note: string;
  readonly noteIcon: LucideIcon;
};

/**
 * Where the page's one action goes, for whoever is reading it: an advisor to
 * their work, an applicant with a request on file to its status instead of
 * into a second application, someone halfway through back to where they
 * were, and everyone else to the first stage.
 */
function useNextStep(): Next {
  const t = useTranslations("advisorOnboarding");
  const session = useSession();
  const application = useLatestApplication();
  const draft = useOnboardingDraft();
  const isAdvisor =
    (session.status === "authenticated" && session.account.role === "advisor") ||
    application?.verificationStatus === "VERIFIED";
  if (isAdvisor) {
    return { href: "/work", label: t("goToWork"), note: t("applyNoteAdvisor"), noteIcon: BadgeCheck };
  }
  if (application) {
    return {
      href: "/advisor-onboarding/pending",
      label: t("seeStatus"),
      note: t("applyNotePending"),
      noteIcon: Hourglass,
    };
  }
  const started =
    Boolean(draft.legalName || draft.phone || draft.birthDate || draft.bio || draft.idFileName) ||
    draft.skills.some((s) => s.skill.trim() || s.proof);
  return started
    ? { href: "/advisor-onboarding/stage-1", label: t("applyContinue"), note: t("applyNoteDraft"), noteIcon: PencilLine }
    : { href: "/advisor-onboarding/stage-1", label: t("start"), note: t("applyHeroNote"), noteIcon: ShieldCheck };
}

/** The page's call to action: the hero's black capsule. */
function PrimaryAction({ next }: { readonly next: Next }) {
  return (
    <Button
      className={cn(authPill(true), "w-auto px-7")}
      nativeButton={false}
      render={<Link href={next.href} />}
    >
      {next.label}
      <ArrowRight aria-hidden />
    </Button>
  );
}

function LaterAction({ label }: { readonly label: string }) {
  return (
    <Button
      className={cn(authPill(), "w-auto px-6")}
      nativeButton={false}
      render={<Link href="/profile" />}
      variant="outline"
    >
      {label}
    </Button>
  );
}

const TAG_TONES = {
  success: "bg-success-surface text-success",
  accent: "bg-accent-surface text-primary",
  ink: "bg-muted text-foreground",
} as const;

/**
 * A capsule laid over the hero photograph, naming one thing the platform does.
 * A statement, not a mock notification: nothing on it pretends to be live.
 */
function HeroTag({
  icon: Icon,
  label,
  tone,
  className,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly tone: keyof typeof TAG_TONES;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        "flex w-max items-center gap-2.5 rounded-full border border-hero-card-border bg-card/95 py-1.5 pr-4 pl-1.5 text-sm font-medium text-foreground shadow-hero backdrop-blur-sm",
        className,
      )}
    >
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", TAG_TONES[tone])}>
        <Icon aria-hidden className="size-4" />
      </span>
      {label}
    </span>
  );
}

function Hero({ next }: { readonly next: Next }) {
  const t = useTranslations("advisorOnboarding");
  const NoteIcon = next.noteIcon;

  return (
    <section className={cn(COLUMN, "grid grid-cols-1 items-center gap-12 pt-4 pb-16 md:pt-8 lg:grid-cols-12 lg:gap-10 lg:pt-12 lg:pb-24")}>
      <div className="flex flex-col items-start gap-5 lg:col-span-6 lg:gap-6">
        <h1 className="font-hero text-4xl leading-tight font-normal tracking-tight text-hero-ink md:text-5xl">
          <span className="block">{t("applyTitle1")}</span>
          {/* The one hand-lettered word on the page: Sriracha, the face
              `/search` quotes its word in. */}
          <span className="block">
            {t.rich("applyTitle2", { hand: handWord })}
          </span>
        </h1>
        <p className={cn(LEAD, "max-w-136")}>{t("applyLead")}</p>
        {/* The phone keeps its action in the bar along the bottom instead. */}
        <div className="hidden items-center gap-3 lg:flex">
          <PrimaryAction next={next} />
          <LaterAction label={t("later")} />
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <NoteIcon aria-hidden className="size-4 shrink-0" />
          {next.note}
        </p>
      </div>

      {/* A consultation in progress, with three of the things the platform
          takes off the advisor's hands laid over its edges. */}
      <div className="relative mx-auto w-full max-w-md md:max-w-none lg:col-span-6 lg:pl-12">
        <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-hero-card-border shadow-hero md:aspect-[16/10] lg:aspect-[5/6]">
          <Image
            alt={t("applyPhotoAlt")}
            className="size-full object-cover object-[28%_50%]"
            fetchPriority="high"
            loading="eager"
            src={serviceInterviewPractice}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 lg:left-12">
          <HeroTag
            className="absolute -top-4 left-3 lg:top-14 lg:-left-14"
            icon={BadgeCheck}
            label={t("applyTagVerified")}
            tone="success"
          />
          <HeroTag
            className="absolute top-[46%] -right-3 hidden md:flex lg:-right-10"
            icon={CalendarCheck2}
            label={t("applyTagBooking")}
            tone="accent"
          />
          <HeroTag
            className="absolute right-3 -bottom-5 lg:right-auto lg:bottom-16 lg:-left-16"
            icon={Wallet}
            label={t("applyTagPaid")}
            tone="ink"
          />
        </div>
      </div>
    </section>
  );
}

/**
 * What the platform takes care of: six facts, each a feature that exists, as
 * one list rather than a wall of small cards. On a desktop the heading and the
 * photograph stay in view beside it while it scrolls.
 */
function CareSection() {
  const t = useTranslations("advisorOnboarding");
  const items = [
    { icon: BadgeCheck, title: t("careVerifiedTitle"), body: t("careVerifiedBody") },
    { icon: CalendarDays, title: t("careBookingTitle"), body: t("careBookingBody") },
    { icon: Wallet, title: t("carePaymentTitle"), body: t("carePaymentBody") },
    { icon: MessagesSquare, title: t("careChatTitle"), body: t("careChatBody") },
    { icon: Landmark, title: t("carePayoutTitle"), body: t("carePayoutBody") },
    { icon: Tags, title: t("carePriceTitle"), body: t("carePriceBody") },
  ];
  return (
    <section className={cn(COLUMN, "grid grid-cols-1 gap-10 py-16 lg:grid-cols-12 lg:gap-16 lg:py-24")}>
      <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
        <div className="flex flex-col gap-3 md:gap-4">
          <h2 className={H2}>{t("applyCareTitle")}</h2>
          <p className={LEAD}>{t("applyCareLead")}</p>
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-hero-card-border shadow-hero md:aspect-[16/10] lg:aspect-[4/5]">
          <Image
            alt={t("applyCarePhotoAlt")}
            className="size-full object-cover object-[60%_40%]"
            src={serviceContractMeeting}
          />
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-border border-y border-border lg:col-span-7">
        {items.map(({ icon: Icon, title, body }) => (
          <li className="flex items-start gap-4 py-6 md:gap-5" key={title}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
              <Icon aria-hidden className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1.5 pt-1">
              <h3 className="font-hero text-lg font-normal tracking-tight text-hero-ink md:text-xl">{title}</h3>
              <p className="text-sm text-muted-foreground md:text-base">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The four parts of an application and its review, down one line. */
function ReviewSteps() {
  const t = useTranslations("advisorOnboarding");
  const steps = [
    { icon: UserRound, title: t("reviewStep1Title"), body: t("reviewStep1Body") },
    { icon: IdCard, title: t("reviewStep2Title"), body: t("reviewStep2Body") },
    { icon: FileBadge, title: t("reviewStep3Title"), body: t("reviewStep3Body") },
    { icon: ShieldCheck, title: t("reviewStep4Title"), body: t("reviewStep4Body") },
  ];

  return (
    <ol className="relative flex flex-col gap-8 lg:col-span-7 lg:col-start-6">
      {/* The line runs from the first mark's centre to the last one's. */}
      <span aria-hidden className="absolute top-5.5 bottom-5.5 left-5.5 w-px bg-on-media/20" />
      {steps.map(({ icon: Icon, title, body }) => (
        <li className="relative flex items-start gap-4 md:gap-5" key={title}>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-footer-surface text-on-media ring-1 ring-on-media/25">
            <Icon aria-hidden className="size-5" />
          </span>
          <div className="flex flex-col gap-1 pt-1.5">
            <h3 className="font-hero text-lg font-normal tracking-tight text-on-media md:text-xl">{title}</h3>
            <p className="text-sm text-on-media/75 md:text-base">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ReviewBand() {
  const t = useTranslations("advisorOnboarding");
  return (
    // The page's one dark band, inset like the sign-in pages' photograph.
    <section className="w-full px-3 md:px-6">
      <div className="overflow-hidden rounded-3xl bg-footer-surface text-on-media">
        <div className={cn(COLUMN, "grid grid-cols-1 gap-12 py-16 md:py-20 lg:grid-cols-12 lg:gap-10 lg:py-24")}>
          <div className="flex flex-col gap-4 lg:col-span-5">
            <h2 className={cn(H2, "text-on-media")}>{t("applyReviewTitle")}</h2>
            <p className="text-base text-on-media/75">{t("applyReviewLead")}</p>
            <p className="mt-2 flex items-start gap-3 rounded-2xl bg-on-media/8 p-4 text-sm text-on-media/85">
              <LockKeyhole aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t("applyPrivacy")}
            </p>
          </div>
          <ReviewSteps />
        </div>
      </div>
    </section>
  );
}

function PrepareSection() {
  const t = useTranslations("advisorOnboarding");
  const items = [
    { icon: IdCard, title: t("prepIdTitle"), body: t("prepIdBody") },
    { icon: UserRound, title: t("prepDetailsTitle"), body: t("prepDetailsBody") },
    { icon: FileBadge, title: t("prepProofTitle"), body: t("prepProofBody") },
    { icon: MessageSquareText, title: t("prepBioTitle"), body: t("prepBioBody") },
  ];
  return (
    <section className={cn(COLUMN, "grid grid-cols-1 gap-10 py-16 lg:grid-cols-12 lg:gap-16 lg:py-24")}>
      <div className="flex flex-col gap-4 lg:col-span-5">
        <h2 className={H2}>{t("applyPrepTitle")}</h2>
        <p className={LEAD}>{t("applyPrepLead")}</p>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("applyDraftNote")}
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-card border border-hero-card-border bg-card shadow-hero-card lg:col-span-7">
        {items.map(({ icon: Icon, title, body }) => (
          <li className="flex items-start gap-4 p-5" key={title}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
              <Icon aria-hidden className="size-4.5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
              <p className="text-base font-medium text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Closing({ next }: { readonly next: Next }) {
  const t = useTranslations("advisorOnboarding");
  return (
    // The home hero's room, with the last word over its bare wall.
    <section className="w-full px-3 pb-3 md:px-6 md:pb-6">
      <div className="relative isolate overflow-hidden rounded-3xl bg-hero-ground">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-hero-photo bg-[length:auto_100%] bg-[position:34%_100%] bg-no-repeat md:bg-cover md:bg-[position:50%_92%]"
        />
        <div className="mx-auto flex max-w-170 flex-col items-center gap-4 px-6 pt-14 pb-56 text-center md:gap-5 md:pt-20 md:pb-72 lg:pt-24 lg:pb-80">
          <h2 className={H2}>{t("applyCloseTitle")}</h2>
          <p className={LEAD}>{t("applyCloseBody")}</p>
          <div className="mt-2 hidden items-center gap-3 lg:flex">
            <PrimaryAction next={next} />
            <LaterAction label={t("later")} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * `/advisor/apply`: the case for becoming an advisor, told to a professional
 * whose time is the thing they sell. What the platform takes off their hands
 * (each a feature that exists: the identity review, bookings against their own
 * hours, payment collected and held, chat, payouts, their own prices), how the
 * review runs, what to have ready, and one action that knows where the reader
 * already is.
 *
 * Figma "Become an advisor (Light)" (995:6410) and its desktop frame
 * (1787:24258) held the heading and the three promises; this keeps both and
 * says the rest. It does not move: only the home page animates.
 */
export function BecomeAdvisorScreen() {
  const next = useNextStep();

  return (
    <MobileScreen className="pb-0" wide="md">
      <ScreenBody className="bg-card">
        <TopBar dock unreadNotifications />
        {/* `doc-scale`: on a landscape tablet the 1710 page made smaller,
            not desktop-sized type in two thirds of the room. */}
        <div className="doc-scale flex w-full flex-col">
          <Hero next={next} />
          <CareSection />
          <ReviewBand />
          <PrepareSection />
          <Closing next={next} />
        </div>
        <SiteFooter className="hidden lg:flex" />
        {/* The phone's action, always in reach while the case is read. */}
        <div className="sticky bottom-0 z-10 w-full border-t border-border bg-card/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:px-20 lg:hidden">
          <Button className={authPill(true)} nativeButton={false} render={<Link href={next.href} />}>
            {next.label}
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}
