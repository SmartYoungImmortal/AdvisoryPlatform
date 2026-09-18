import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  MessageSquare,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { LevelBadge } from "@/components/advisor-public/level-badge";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { SegmentedTabs } from "@/components/mobile/segmented-tabs";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TopBar } from "@/components/topbar";
import { ThaiText } from "@/components/mobile/thai-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LISTING_PREVIEW,
  publicProfile,
  type ListingEntry,
  type ProfileReview,
  type ProfileTab,
  type PublicProfile,
} from "@/lib/catalogue/profiles";

const STAR_VALUES = [5, 4, 3, 2, 1] as const;

function profileHref(advisorId: string, tab: ProfileTab | "sheet"): string {
  const base = `/advisors/${advisorId}`;
  if (tab === "services") return base;
  if (tab === "sheet") return `${base}/services`;
  return `${base}/${tab}`;
}

function Header({ profile }: { readonly profile: PublicProfile }) {
  const t = useTranslations("advisorProfile");
  const s = useTranslations("service");
  const { advisor } = profile;

  return (
    // Figma's desktop header (1564:26852) lays the same parts on one row: the
    // portrait, then the name and credential beside it, with the three counts
    // holding the right edge and no card around them.
    <div className="flex w-full shrink-0 flex-col items-center gap-3 overflow-clip px-6 lg:mx-auto lg:max-w-[1440px] lg:flex-row lg:items-center lg:gap-5 lg:border-b lg:border-border lg:px-30 lg:py-6">
      <ChatAvatar crop={advisor.crop} size={80} src={advisor.avatar} />
      {/* `contents` keeps the phone's stack exactly as it was; from `lg` these
          three become the middle column of the row. */}
      <div className="contents lg:flex lg:min-w-px lg:flex-1 lg:flex-col lg:items-start lg:gap-1">
        <div className="flex shrink-0 items-center gap-1">
          <h1 className="font-latin text-2xl font-semibold text-foreground">
            {advisor.name}
          </h1>
          {advisor.verified ? (
            <ShieldCheck
              aria-label={s("verified")}
              className="size-4.5 shrink-0 text-primary"
              role="img"
            />
          ) : null}
        </div>
        {profile.level ? <LevelBadge level={profile.level} /> : null}
        <p className="text-center text-sm font-normal text-muted-foreground lg:text-start">
          {t("credentialField", {
            credential: advisor.credential,
            field: advisor.field,
          })}
        </p>
      </div>

      {/* Figma "Stats" — three counts on a bordered card, split by hairlines. The
          frame's 12/16px padding sits inside its stroke, hence one pixel less here. */}
      <div className="flex w-full shrink-0 items-start gap-2 overflow-clip rounded-xl border border-border bg-card px-[15px] py-[11px] lg:w-auto lg:gap-8 lg:border-0 lg:bg-transparent lg:p-0">
        {[
          { value: advisor.rating, label: t("statRating") },
          { value: String(advisor.consultations), label: t("statConsultations") },
          { value: String(advisor.writtenReviews), label: t("statReviews") },
        ].map((stat, index) => (
          <Fragment key={stat.label}>
            {index > 0 ? (
              <div className="w-px shrink-0 self-stretch bg-border lg:hidden" />
            ) : null}
            <div className="flex min-w-px flex-1 flex-col items-center gap-1 text-center">
              <p className="w-full font-latin text-base font-semibold text-foreground">
                {stat.value}
              </p>
              <p className="w-full text-xs font-normal text-muted-foreground">
                {stat.label}
              </p>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function SectionHead({
  title,
  trailing,
}: {
  readonly title: ReactNode;
  readonly trailing: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
      <h2 className="min-w-px flex-1 text-base font-semibold text-foreground">
        {title}
      </h2>
      <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
        {trailing}
      </p>
    </div>
  );
}

/**
 * Figma "Service Card" — an 88px cover, the title, the slot length, the score and
 * the per-slot price. It links only when the listing is a catalogue service of this
 * same advisor; otherwise there is no detail page it could honestly open.
 */
function ListingCard({ entry }: { readonly entry: ListingEntry }) {
  const t = useTranslations("advisorProfile");
  // The frame's 8px padding sits inside its stroke, hence 7px here.
  const className =
    "flex w-full shrink-0 items-start gap-3 overflow-clip rounded-xl border border-border bg-card p-[7px]";
  const body = (
    <>
      <Image
        alt=""
        className="size-22 shrink-0 rounded-xl object-cover"
        src={entry.cover}
      />
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full text-sm font-semibold text-foreground">
          {entry.title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {t("slotLength")}
        </p>
        <div className="flex w-full shrink-0 items-center gap-1 overflow-clip">
          <Star className="size-3 shrink-0 text-primary" />
          <p className="shrink-0 font-latin text-xs font-normal text-foreground">
            {entry.rating}
          </p>
          <p className="min-w-px flex-1 font-latin text-xs font-normal text-muted-foreground">
            ({entry.ratingCount})
          </p>
          <p className="shrink-0 font-latin text-sm font-semibold text-foreground">
            {t("price", { price: entry.price })}
          </p>
        </div>
      </div>
    </>
  );

  return entry.serviceId ? (
    <Link className={className} href={`/service/${entry.serviceId}`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function ServicesTab({ profile }: { readonly profile: PublicProfile }) {
  const t = useTranslations("advisorProfile");
  const total = profile.listing.length;

  return (
    // Figma's desktop frame lays the listings two across inside a card of
    // their own; the phone stacks them full width.
    <section className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 lg:grid lg:grid-cols-2 lg:gap-4 lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-5">
      <div className="w-full lg:col-span-2">
        <SectionHead
          title={t("servicesTitle")}
          trailing={t("serviceCount", { count: total })}
        />
      </div>
      {profile.listing.slice(0, LISTING_PREVIEW).map((entry) => (
        <ListingCard entry={entry} key={entry.title} />
      ))}
      {total > LISTING_PREVIEW ? (
        <NeutralButton
          className="h-11.5 text-primary lg:col-span-2"
          href={profileHref(profile.advisor.id, "sheet")}
        >
          {t("seeAllServices", { count: total })}
        </NeutralButton>
      ) : null}
    </section>
  );
}

function AboutTab({ profile }: { readonly profile: PublicProfile }) {
  const t = useTranslations("advisorProfile");

  return (
    <section className="flex w-full shrink-0 flex-col items-start gap-6 overflow-clip px-6 lg:gap-3 lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-5">
      <h2 className="hidden w-full text-base font-semibold text-foreground lg:block">
        {t("tab.about")}
      </h2>
      <p className="w-full text-sm font-normal text-muted-foreground">
        <ThaiText>{profile.about}</ThaiText>
      </p>
      {/* Figma's desktop frame (1564:26852) moves the skills into the column
          beside the page, so here they stop at the breakpoint. */}
      {profile.skills.length > 0 ? (
        <div className="flex w-full shrink-0 flex-col items-start gap-3 lg:hidden">
          <h2 className="w-full text-base font-semibold text-foreground">
            {t("verifiedSkills")}
          </h2>
          {/* The frame's 12px padding sits inside its stroke, hence 11px here. */}
          {profile.skills.map((skill) => (
            <div
              className="flex w-full shrink-0 items-center gap-3 overflow-clip rounded-[12px] border border-border bg-card p-[11px]"
              key={skill}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <ShieldCheck className="size-4.5 text-primary" />
              </span>
              <div className="flex min-w-px flex-1 flex-col items-start gap-1">
                <p className="w-full text-sm font-semibold text-foreground">
                  {skill}
                </p>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("verifiedByTeam")}
                </p>
              </div>
              <ShieldCheck
                aria-label={t("verified")}
                className="size-4 shrink-0 text-success"
                role="img"
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReviewCard({ review }: { readonly review: ProfileReview }) {
  return (
    // The frame's 12px padding sits inside its stroke, hence 11px here.
    <article className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-xl border border-border bg-card p-[11px]">
      <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
        <Image
          alt=""
          className="size-9 shrink-0 rounded-full object-cover"
          src={review.avatar}
        />
        <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
          <p className="w-full text-sm font-semibold text-foreground">
            {review.name}
          </p>
          <p className="w-full text-xs font-normal text-muted-foreground">
            {review.date}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 font-latin text-sm font-semibold text-foreground">
          <Star className="size-3 text-primary" />
          {review.stars}
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal whitespace-nowrap text-muted-foreground">
        <FileText className="size-3 shrink-0" />
        {review.service}
      </span>
      <p className="w-full text-sm font-normal text-muted-foreground">
        <ThaiText>{review.body}</ThaiText>
      </p>
    </article>
  );
}

function ReviewsTab({ profile }: { readonly profile: PublicProfile }) {
  const t = useTranslations("advisorProfile");
  const { advisor } = profile;

  return (
    <section className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
      <SectionHead
        title={t("reviewsTitle")}
        trailing={t("reviewCount", { count: advisor.writtenReviews })}
      />

      {/* Figma "Summary" — the score beside the shape of the score. */}
      <div className="flex w-full shrink-0 items-center gap-4 overflow-clip rounded-xl border border-border bg-card p-[15px]">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <p className="font-latin text-heading font-semibold text-foreground">
            {advisor.rating}
          </p>
          <div className="flex items-start gap-0.5">
            {STAR_VALUES.map((value) => (
              <Star className="size-2.75 text-primary" key={value} />
            ))}
          </div>
        </div>
        <div className="flex min-w-px flex-1 flex-col gap-1">
          {STAR_VALUES.map((value, index) => (
            <div className="flex w-full items-center gap-2" key={value}>
              <span className="w-[7px] shrink-0 font-latin text-xs font-normal text-muted-foreground">
                {value}
              </span>
              <span className="h-1.5 min-w-px flex-1 overflow-clip rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${advisor.ratingBreakdown[index]}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      {profile.reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}

      {/* No "all reviews" frame exists yet, so this is a label, not a dead link. */}
      <NeutralButton className="h-11">
        {t("seeAllReviews", { count: advisor.writtenReviews })}
      </NeutralButton>
    </section>
  );
}

/**
 * Figma "Advisor public profile - All services" (1564:24558) — the whole listing in
 * a sheet over the profile. The frame's covers are grey placeholders, which reads as
 * an image fill that did not render there; the sheet shows the same covers the
 * services tab does, so one listing never has two looks.
 */
function AllServicesSheet({ profile }: { readonly profile: PublicProfile }) {
  const t = useTranslations("advisorProfile");

  return (
    <>
      <div aria-hidden className="absolute inset-0 z-10 bg-scrim/40" />
      {/* The frame drops the sheet 122px from its top, 24px of which is the status
          bar the app does not draw — hence 98px here. */}
      <div
        aria-label={t("servicesTitle")}
        className="absolute inset-x-0 top-24.5 bottom-0 z-20 flex flex-col overflow-y-auto rounded-t-[20px] bg-card px-6 pt-2 pb-5"
        role="dialog"
      >
        <div
          aria-hidden
          className="mx-auto h-1 w-9 shrink-0 rounded-full bg-border"
        />
        <div className="mt-4 flex w-full shrink-0 flex-col items-start gap-2">
          <div className="flex w-full items-center gap-2">
            <h2 className="min-w-px flex-1 text-xl font-semibold text-foreground">
              {t("servicesTitle")}
            </h2>
            <p className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
              {t("serviceCount", { count: profile.listing.length })}
            </p>
          </div>
          <p className="w-full font-latin text-xs font-normal text-muted-foreground">
            {t("ofAdvisor", { name: profile.advisor.name })}
          </p>
        </div>
        <div className="mt-3 flex w-full shrink-0 flex-col gap-2.5">
          {profile.listing.map((entry) => (
            <SheetListing entry={entry} key={entry.title} />
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Figma "Service / …" row of the all-services sheet — a 56px cover and a
 * one-line title. The frame's 10/12px padding sits inside its stroke.
 */
function SheetListing({ entry }: { readonly entry: ListingEntry }) {
  const t = useTranslations("advisorProfile");
  const className =
    "flex w-full shrink-0 items-center gap-3 overflow-clip rounded-[12px] border border-border bg-card py-[9px] pr-[11px] pl-[9px]";
  const body = (
    <>
      <Image
        alt=""
        className="size-14 shrink-0 rounded-lg object-cover"
        src={entry.cover}
      />
      <div className="flex min-w-px flex-1 flex-col items-start gap-[3px] overflow-clip">
        <p className="w-full truncate text-base font-medium text-foreground">
          {entry.title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {t("slotLength")}
        </p>
        <div className="flex w-full items-center gap-2">
          <p className="min-w-px flex-1 font-latin text-xs font-normal text-muted-foreground">
            ★ {entry.rating} ({entry.ratingCount})
          </p>
          <p className="shrink-0 font-latin text-sm font-medium text-foreground">
            {t("pricePerSlot", { price: entry.price })}
          </p>
        </div>
      </div>
    </>
  );

  return entry.serviceId ? (
    <Link className={className} href={`/service/${entry.serviceId}`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * Figma "Advisor public profile" — the Services / About / Reviews views
 * (1226:17052, 1277:17249, 1277:17413) and the all-services sheet (1564:24558).
 *
 * The tabs are sibling routes. The bottom bar's primary action opens the sheet,
 * because choosing a service is the step between this page and a booking.
 */
export function AdvisorPublicProfileScreen({
  advisorId,
  tab = "services",
  sheet = false,
}: {
  readonly advisorId: string;
  readonly tab?: ProfileTab;
  readonly sheet?: boolean;
}) {
  const t = useTranslations("advisorProfile");
  const c = useTranslations("common");
  const profile = publicProfile(advisorId);

  if (!profile) notFound();

  const tabs: readonly ProfileTab[] = ["services", "about", "reviews"];

  return (
    // Figma "Desktop / Advisor public profile (Light)" (1564:26852): the phone
    // frame pages three tabs; at 1440 they are three sections of one page, with
    // the way to book — and the skills that justify it — held beside them.
    <MobileScreen className="pb-0" wide>
      <ScreenTopBar className="lg:hidden" href="/search" label={c("back")} />

      <ScreenBody className={cn("gap-6 pb-6 lg:gap-0 lg:pb-0", sheet && "overflow-hidden")}>
        <div className="hidden w-full lg:block">
          <TopBar unreadNotifications />
        </div>

        <Header profile={profile} />
        <SegmentedTabs
          className="pt-1 pb-2 lg:hidden"
          current={tab}
          items={tabs.map((key) => ({
            key,
            label: t(`tab.${key}`),
            href: profileHref(advisorId, key),
          }))}
          label={profile.advisor.name}
        />

        <div className="w-full lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:px-24 lg:pt-6 lg:pb-14">
          {/* Each tab keeps its route on the phone and simply stacks here. */}
          <div className="flex w-full flex-col gap-6 lg:px-6">
            <div className={cn("w-full", tab !== "services" && "hidden lg:block")}>
              <ServicesTab profile={profile} />
            </div>
            <div className={cn("w-full", tab !== "about" && "hidden lg:block")}>
              <AboutTab profile={profile} />
            </div>
            <div className={cn("w-full", tab !== "reviews" && "hidden lg:block")}>
              <ReviewsTab profile={profile} />
            </div>
          </div>

          <aside className="hidden lg:sticky lg:top-24 lg:me-6 lg:flex lg:flex-col lg:gap-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {t("pickServiceTitle")}
                </p>
                <p className="text-xs font-normal text-muted-foreground">
                  {t("serviceCount", { count: profile.listing.length })} ·{" "}
                  {t("slotLength")}
                </p>
              </div>
              <PrimaryButton href={profileHref(advisorId, "sheet")}>
                {t("chooseService")}
              </PrimaryButton>
              <NeutralButton href={`/chat/${advisorId}`}>{t("chat")}</NeutralButton>
            </div>

            {profile.skills.length > 0 ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">
                  {t("verifiedSkills")}
                </p>
                {profile.skills.map((skill) => (
                  <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 p-3" key={skill}>
                    <p className="text-sm font-medium text-foreground">{skill}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {t("verifiedByTeam")}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </aside>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>

      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip border-t border-border bg-card px-6 py-3 lg:hidden">
        <Button
          aria-label={t("chat")}
          className="size-9 shrink-0"
          nativeButton={false}
          render={<Link href={`/chat/${advisorId}`} />}
          size="icon"
          variant="outline"
        >
          <MessageSquare className="size-4" />
        </Button>
        <PrimaryButton
          className="min-w-px flex-1"
          href={profileHref(advisorId, "sheet")}
        >
          {t("chooseService")}
        </PrimaryButton>
      </div>

      {sheet ? <AllServicesSheet profile={profile} /> : null}
    </MobileScreen>
  );
}
