"use client";

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

import { LiveAdvisorProfileScreen } from "@/components/advisor-public/advisor-public-live";
import { LevelBadge } from "@/components/advisor-public/level-badge";
import { asUuid, useQueryValue } from "@/components/bookings/booking-flow";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { EmptyState } from "@/components/mobile/empty-state";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { SegmentedTabs } from "@/components/mobile/segmented-tabs";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TopBar } from "@/components/topbar";
import { ThaiText } from "@/components/mobile/thai-text";
import { Button } from "@/components/ui/button";
import { PAGE, PAGE_INSET_BLOCKS, SPLIT_WITH_ASIDE } from "@/lib/layout";
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
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-center gap-3 overflow-clip px-6 lg:flex-row lg:items-center lg:gap-5 lg:border-b lg:border-border lg:py-6",
        PAGE,
      )}
    >
      <ChatAvatar crop={advisor.crop} size={80} src={advisor.avatar} />
      {/* `contents` keeps the phone's stack exactly as it was; from `lg` these
          three become the middle column of the row. */}
      <div className="contents lg:flex lg:min-w-px lg:flex-1 lg:flex-col lg:items-start lg:gap-1.5">
        <h1 className="font-latin text-2xl font-semibold text-foreground lg:text-heading">
          {advisor.name}
        </h1>
        {/* The 18px shield floating beside the name said "verified" only to a
            reader who already knew what it meant. Word and colour together now,
            beside the level it belongs with. */}
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 lg:justify-start">
          {profile.level ? <LevelBadge level={profile.level} /> : null}
          {advisor.verified ? (
            <StatusPill icon={ShieldCheck} tone="success">
              {s("verified")}
            </StatusPill>
          ) : null}
        </div>
        <p className="text-center text-sm font-normal text-muted-foreground lg:text-start">
          {t("credentialField", {
            credential: advisor.credential,
            field: advisor.field,
          })}
        </p>
      </div>

      {/* Figma "Stats" — three counts on a bordered card, split by hairlines. */}
      <div
        className={cn(
          surfaceClass(),
          "flex w-full shrink-0 items-start gap-2 overflow-clip px-4 py-3",
          "lg:w-auto lg:gap-8 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none",
        )}
      >
        {[
          { value: advisor.rating, label: t("statRating") },
          { value: String(advisor.consultations), label: t("statConsultations") },
          { value: String(advisor.writtenReviews), label: t("statReviews") },
        ].map((stat, index) => (
          <Fragment key={stat.label}>
            {index > 0 ? (
              <div className="w-px shrink-0 self-stretch bg-border lg:hidden" />
            ) : null}
            <div className="flex min-w-px flex-1 flex-col items-center gap-0.5 text-center">
              <p className="w-full font-latin text-lg font-semibold tabular-nums text-foreground lg:text-xl">
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
      <h2 className="min-w-px flex-1 text-base font-semibold text-foreground lg:text-lg">
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
  // Only the rows that actually open somewhere get the lift — a static card that
  // rises under the pointer is a lie about what a click will do.
  const className = cn(
    surfaceClass({ interactive: Boolean(entry.serviceId) }),
    "flex w-full shrink-0 items-start gap-3 overflow-clip p-2",
  );
  const body = (
    <>
      <Image
        alt=""
        className="size-22 shrink-0 rounded-card bg-muted object-cover"
        src={entry.cover}
      />
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full text-base font-semibold text-foreground">
          {entry.title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {t("slotLength")}
        </p>
        <div className="flex w-full shrink-0 items-center gap-1 overflow-clip">
          <Star className="size-3 shrink-0 fill-primary text-primary" />
          <p className="shrink-0 font-latin text-sm font-semibold tabular-nums text-foreground">
            {entry.rating}
          </p>
          <p className="min-w-px flex-1 font-latin text-xs font-normal tabular-nums text-muted-foreground">
            ({entry.ratingCount})
          </p>
          <p className="shrink-0 font-latin text-base font-semibold tabular-nums text-foreground">
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
    <section className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 lg:grid lg:grid-cols-2 lg:gap-4 lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-5 lg:shadow-card">
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
          block
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
    <section className="flex w-full shrink-0 flex-col items-start gap-6 overflow-clip px-6 lg:gap-3 lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-5 lg:shadow-card">
      <h2 className="hidden w-full text-base font-semibold text-foreground lg:block lg:text-lg">
        {t("tab.about")}
      </h2>
      {/* The bio is the whole point of this tab, not a caption on it. */}
      <p className="w-full text-sm font-normal text-foreground lg:text-base">
        <ThaiText>{profile.about}</ThaiText>
      </p>
      {/* Figma's desktop frame (1564:26852) moves the skills into the column
          beside the page, so here they stop at the breakpoint. */}
      {profile.skills.length > 0 ? (
        <div className="flex w-full shrink-0 flex-col items-start gap-3 lg:hidden">
          <h2 className="w-full text-base font-semibold text-foreground">
            {t("verifiedSkills")}
          </h2>
          {profile.skills.map((skill) => (
            <Surface
              className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3"
              key={skill}
              tier="flat"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10">
                <ShieldCheck className="size-4.5 text-success" />
              </span>
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
                <p className="w-full text-sm font-semibold text-foreground">
                  {skill}
                </p>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("verifiedByTeam")}
                </p>
              </div>
              <StatusPill tone="success">{t("verified")}</StatusPill>
            </Surface>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReviewCard({ review }: { readonly review: ProfileReview }) {
  return (
    <article
      className={cn(
        surfaceClass(),
        "flex w-full shrink-0 flex-col items-start gap-2 overflow-clip p-3",
      )}
    >
      <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
        <Image
          alt=""
          className="size-9 shrink-0 rounded-full bg-muted object-cover"
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
        <span className="flex shrink-0 items-center gap-1 font-latin text-sm font-semibold tabular-nums text-foreground">
          <Star className="size-3 fill-primary text-primary" />
          {review.stars}
        </span>
      </div>
      <StatusPill icon={FileText}>{review.service}</StatusPill>
      {/* The quote is the review. It is not a caption under the name. */}
      <p className="w-full text-sm font-normal text-foreground">
        <ThaiText>{review.body}</ThaiText>
      </p>
    </article>
  );
}

function ReviewsTab({ profile }: { readonly profile: PublicProfile }) {
  const t = useTranslations("advisorProfile");
  const r = useTranslations("reviews");
  const { advisor } = profile;

  return (
    <section className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
      <SectionHead
        title={t("reviewsTitle")}
        trailing={t("reviewCount", { count: advisor.writtenReviews })}
      />

      {/* Figma "Summary" — the score beside the shape of the score. */}
      <Surface className="flex w-full shrink-0 items-center gap-4 overflow-clip p-4">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <p className="font-latin text-heading font-semibold tabular-nums text-foreground">
            {advisor.rating}
          </p>
          <div className="flex items-start gap-0.5">
            {STAR_VALUES.map((value) => (
              <Star className="size-2.75 fill-primary text-primary" key={value} />
            ))}
          </div>
        </div>
        <div className="flex min-w-px flex-1 flex-col gap-1">
          {STAR_VALUES.map((value, index) => (
            <div className="flex w-full items-center gap-2" key={value}>
              <span className="w-[7px] shrink-0 font-latin text-xs font-normal tabular-nums text-muted-foreground">
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
      </Surface>

      {/* Two of the three advisors have no `EXTENSIONS` entry, so this tab really
          does render empty on `/advisors/thanakrit-w/reviews` and
          `/advisors/weerapat-k/reviews` — where it used to end on a score
          summary, a dead button and nothing between them. */}
      {profile.reviews.length > 0 ? (
        <>
          <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
            {profile.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>

          {/* No "all reviews" frame exists yet, so this is a label, not a dead link. */}
          <NeutralButton block className="h-11">
            {t("seeAllReviews", { count: advisor.writtenReviews })}
          </NeutralButton>
        </>
      ) : (
        <Surface className="w-full" tier="well">
          <EmptyState
            body={r("emptyBody")}
            icon={MessageSquare}
            title={r("emptyTitle")}
          />
        </Surface>
      )}
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
        className="absolute inset-x-0 top-24.5 bottom-0 z-20 flex flex-col overflow-y-auto rounded-t-[20px] bg-card px-6 pt-2 pb-5 shadow-panel"
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
  const className = cn(
    surfaceClass({ tier: "flat", interactive: Boolean(entry.serviceId) }),
    "flex w-full shrink-0 items-center gap-3 overflow-clip p-2.5",
  );
  const body = (
    <>
      <Image
        alt=""
        className="size-14 shrink-0 rounded-lg bg-muted object-cover"
        src={entry.cover}
      />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full truncate text-base font-semibold text-foreground">
          {entry.title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {t("slotLength")}
        </p>
        <div className="flex w-full items-center gap-2">
          <p className="min-w-px flex-1 font-latin text-xs font-normal tabular-nums text-muted-foreground">
            ★ {entry.rating} ({entry.ratingCount})
          </p>
          <p className="shrink-0 font-latin text-base font-semibold tabular-nums text-foreground">
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
  // `?advisorId=<uuid>` on a prerendered slug is how the API-backed profile is
  // reached under `output: "export"` — see `components/bookings/booking-flow.ts`.
  const live = asUuid(useQueryValue("advisorId")) ?? asUuid(advisorId);
  const profile = publicProfile(advisorId);

  if (live) return <LiveAdvisorProfileScreen advisorId={live} tab={tab} />;

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

        <div
          className={cn(
            "w-full lg:pt-6 lg:pb-14",
            PAGE_INSET_BLOCKS,
            SPLIT_WITH_ASIDE,
          )}
        >
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
            {/* The panel that rides beside the page sits a tier above the cards
                in the column, so it takes the panel shadow. */}
            <Surface className="flex flex-col gap-3 p-4 shadow-panel">
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-semibold text-foreground">
                  {t("pickServiceTitle")}
                </p>
                <p className="text-xs font-normal text-muted-foreground">
                  {t("serviceCount", { count: profile.listing.length })} ·{" "}
                  {t("slotLength")}
                </p>
              </div>
              <PrimaryButton block href={profileHref(advisorId, "sheet")} size="lg">
                {t("chooseService")}
              </PrimaryButton>
              <NeutralButton block href={`/chat/${advisorId}`}>
                {t("chat")}
              </NeutralButton>
            </Surface>

            {profile.skills.length > 0 ? (
              <Surface className="flex flex-col gap-3 p-4">
                <p className="text-base font-semibold text-foreground">
                  {t("verifiedSkills")}
                </p>
                {profile.skills.map((skill) => (
                  <Surface
                    className="flex items-center gap-2.5 p-3"
                    key={skill}
                    tier="well"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                      <ShieldCheck aria-hidden className="size-4 text-success" />
                    </span>
                    <span className="flex min-w-px flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        {skill}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {t("verifiedByTeam")}
                      </span>
                    </span>
                  </Surface>
                ))}
              </Surface>
            ) : null}
          </aside>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>

      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip border-t border-border bg-card px-6 py-3 shadow-panel lg:hidden">
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
          block
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
