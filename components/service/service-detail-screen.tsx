"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MessageSquare, ShieldCheck, Star } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import {
  formatDuration,
  getAdvisor,
  getReviews,
  getService,
  packagesFor,
  services,
  type Advisor,
  type ServicePackage,
  type Service,
  type Slot,
} from "@/lib/catalogue/services";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { FaqSection } from "@/components/marketing/faq-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { AvailabilityPill, SectionHead } from "@/components/home/parts";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import {
  DistributionRow,
  SECTION_HEAD,
  StepList,
  TopicChip,
} from "@/components/service/parts";
import { LiveServiceDetailScreen } from "@/components/service/service-detail-live";
import { ServiceGallery } from "@/components/service/service-gallery";
import { asUuid, useQueryValue } from "@/components/bookings/booking-flow";
import { TopBar } from "@/components/topbar";
import { PAGE, PAGE_INSET_BLOCKS, SPLIT_WITH_ASIDE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * Figma "Stat" — a value over its label, each third of the advisor card's row.
 *
 * The figure was set at the same 14px as the label under it and in the Thai face,
 * so three numbers that exist to be compared were the hardest thing on the card
 * to compare. Latin face, tabular figures, one step up.
 */
function AdvisorStat({
  value,
  label,
}: {
  readonly value: string;
  readonly label: string;
}) {
  return (
    <div className="flex min-w-px flex-1 flex-col items-center gap-0.5 overflow-clip text-center">
      <p className="w-full font-latin text-base font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="w-full text-xs font-normal text-muted-foreground">{label}</p>
    </div>
  );
}

/** Figma "Score" — the average, a five-star row, and the count it rests on. */
function ScoreSummary({
  advisor,
  reviewCountLabel,
}: {
  readonly advisor: Advisor;
  readonly reviewCountLabel: string;
}) {
  return (
    <Surface className="flex w-full shrink-0 items-center gap-4 overflow-clip p-4">
      <div className="flex shrink-0 flex-col items-center gap-1 overflow-clip">
        <p className="font-latin text-heading font-semibold tabular-nums whitespace-nowrap text-foreground">
          {advisor.rating}
        </p>
        <div className="flex shrink-0 items-start gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star className="size-2.75 shrink-0 fill-primary text-primary" key={i} />
          ))}
        </div>
        <p className="text-xs font-normal whitespace-nowrap text-muted-foreground">
          {reviewCountLabel}
        </p>
      </div>
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        {advisor.ratingBreakdown.map((fill, i) => (
          <DistributionRow fill={fill} key={5 - i} label={String(5 - i)} />
        ))}
      </div>
    </Surface>
  );
}

/**
 * One bookable time. The seat count only prints when it is low enough to matter,
 * and when it does it is a warning rather than a second line of accent text — the
 * chip is a menu of times, so the one that is nearly gone has to look different
 * and not merely say so.
 */
function SlotChip({
  slot,
  dayLabel,
  seatsLabel,
}: {
  readonly slot: Slot;
  readonly dayLabel: string;
  readonly seatsLabel?: string;
}) {
  return (
    <Surface
      className={cn(
        "flex shrink-0 flex-col items-start gap-1 px-3 py-2 transition-colors hover:border-accented",
        seatsLabel && "border-warning/40",
      )}
      tier="flat"
    >
      <p className="text-sm font-semibold whitespace-nowrap text-foreground">
        {dayLabel} <span className="font-latin tabular-nums">{slot.time}</span>
      </p>
      {seatsLabel ? (
        <StatusPill className="px-1.5 py-0.5" tone="warning">
          {seatsLabel}
        </StatusPill>
      ) : null}
    </Surface>
  );
}

/** The tier keys are data; their names are copy, so they resolve through here. */
const PACKAGE_LABEL = {
  brief: "pkgBrief",
  standard: "pkgStandard",
  deep: "pkgDeep",
} as const;

/**
 * One tier of the same consultation.
 *
 * The page used to price a single hour and list what it covered, which left the
 * two readers it actually gets — one with a single question, one with a year of
 * receipts — looking at the same ฿1,200 and both deciding it was the wrong
 * amount. The recommended tier is the one the rest of the page already quotes.
 */
function PackageCard({ pack }: { readonly pack: ServicePackage }) {
  const t = useTranslations("service");
  const format = useFormatter();

  return (
    // The recommended tier carries the accent edge *and* the ring, so the card a
    // reader is meant to take reads as raised out of the three rather than as the
    // one with a slightly bluer hairline.
    <Surface
      className={cn(
        "flex w-full shrink-0 flex-col items-start gap-3 overflow-clip p-4",
        pack.recommended && "border-primary ring-1 ring-primary/15",
      )}
    >
      <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
        <p className="shrink-0 text-base font-semibold whitespace-nowrap text-foreground">
          {t(PACKAGE_LABEL[pack.key])}
        </p>
        {pack.recommended ? (
          <StatusPill className="px-2 py-0.5" tone="accent">
            {t("pkgRecommended")}
          </StatusPill>
        ) : null}
        <p className="min-w-px flex-1 text-right text-xs font-normal whitespace-nowrap text-muted-foreground">
          {formatDuration(pack.minutes)}
        </p>
      </div>

      <p className="font-latin w-full text-2xl font-semibold tabular-nums text-foreground">
        {format.number(pack.price, "baht")}
      </p>

      <ul className="flex w-full shrink-0 flex-col items-start gap-2">
        {pack.includes.map((line) => (
          <li className="flex w-full shrink-0 items-start gap-2" key={line}>
            <BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="min-w-px flex-1 text-sm font-normal text-foreground">
              <ThaiText>{line}</ThaiText>
            </span>
          </li>
        ))}
      </ul>

      {/* A card's single action, so it keeps the full width at every size. */}
      {pack.recommended ? (
        <PrimaryButton block href="/checkout/card">
          {t("pkgSelect")}
        </PrimaryButton>
      ) : (
        <NeutralButton block href="/checkout/card">
          {t("pkgSelect")}
        </NeutralButton>
      )}
    </Surface>
  );
}

/** A sibling consultation, as a card in the rail at the foot of the page. */
function RelatedCard({ service }: { readonly service: Service }) {
  const format = useFormatter();

  return (
    <Link
      className={cn(
        surfaceClass({ interactive: true }),
        "flex w-40 shrink-0 flex-col items-start overflow-clip lg:w-full",
      )}
      href={`/service/${service.id}`}
    >
      <Image alt="" className="aspect-video w-full object-cover" src={service.cover} />
      <div className="flex w-full flex-1 flex-col items-start gap-1 p-3">
        <p className="line-clamp-2 w-full text-base font-semibold text-foreground">
          {service.title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {formatDuration(service.minutes)}
        </p>
        <p className="font-latin mt-auto w-full text-base font-semibold tabular-nums text-foreground">
          {format.number(service.price, "baht")}
        </p>
      </div>
    </Link>
  );
}

/**
 * The consultation a home rail or a search result points at.
 *
 * This screen is what was missing from the funnel: browsing dead-ended because
 * there was nowhere for a card to link to, so every card on home and on
 * `/search` was rendered as an inert `<div>` and the only way forward was to
 * start over in search. It sits between the two and `/checkout/card`.
 *
 * Laid out the way the freelance marketplaces lay this page out — nav bar,
 * breadcrumb, 16:9 gallery, then offer, seller, deliverables, availability,
 * how-it-works, reviews, FAQ and the rest of the seller's catalogue, over a
 * sticky action bar. The Figma frame drew only the middle of that; the ends are
 * what let a reader who lands here from search know where they are and what to
 * do next.
 */
export function ServiceDetailScreen({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("service");
  const c = useTranslations("common");
  const format = useFormatter();

  // The API keys services on uuid and this route prerenders slugs, so the uuid
  // arrives as `?serviceId=` on one of those slugs — see
  // `components/bookings/booking-flow.ts`. A uuid in the path is honoured too,
  // for the day `generateStaticParams` can produce them. Without one the screen
  // is exactly what it was: the fixture for this slug.
  const live = asUuid(useQueryValue("serviceId")) ?? asUuid(serviceId);

  const service = getService(serviceId);
  const advisor = service ? getAdvisor(service.advisorId) : undefined;

  if (live) return <LiveServiceDetailScreen serviceId={live} />;

  // A prerendered route can only be reached for an id in `generateStaticParams`,
  // so this is a type guard rather than a state the reader meets. It still gets
  // a real screen instead of a crash.
  if (!service || !advisor) {
    return (
      <MobileScreen>
        <ScreenTopBar href="/" label={c("back")} />
        <ScreenBody>
          <ScreenHeading subtitle={t("notFoundBody")} title={t("notFoundTitle")} />
          <div className="flex w-full shrink-0 px-6 pt-2">
            <PrimaryButton href="/">{t("notFoundCta")}</PrimaryButton>
          </div>
        </ScreenBody>
      </MobileScreen>
    );
  }

  const reviews = getReviews(service.id);
  const price = format.number(service.price, "baht");
  const duration = formatDuration(service.minutes);
  const reviewCountLabel = t("reviewCount", { count: advisor.reviews });
  const packages = packagesFor(service);
  const related = services.filter(
    (s) => s.advisorId === advisor.id && s.id !== service.id,
  );

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody>
        {/* The app's own nav bar, solid and above the gallery rather than floated
            over it: these covers are stock photography with no safe area, and a
            reversed lockup disappears into the light half of the crop. No back
            control — the breadcrumb under it is what goes back. */}
        <TopBar unreadNotifications />

        {/* Where the reader is. A search result drops them here with no idea
            which corner of the catalogue they landed in. */}
        <div className={cn("w-full shrink-0 px-6 py-3 lg:pt-6", PAGE)}>
          <Breadcrumb aria-label={t("breadcrumbLabel")}>
            <BreadcrumbList className="gap-1 text-xs sm:gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/search" />}>
                  {t("breadcrumbAll")}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/search" />}>
                  {service.category}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">
                  {service.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Figma's desktop frame runs the page as two columns: everything the
            phone stacks stays in the left one, and the price — which the phone
            pins to its bottom edge — becomes a card that rides along on the
            right. The grid inset is 96 rather than the page's 120 because the
            blocks inside carry the remaining 24 as their own padding. */}
        <div className={cn("w-full lg:pb-14", PAGE_INSET_BLOCKS, SPLIT_WITH_ASIDE)}>
          <div className="flex w-full flex-col lg:px-6">
            <ServiceGallery photos={service.gallery} />

            <div className="flex w-full shrink-0 flex-col items-center gap-6 pb-6 lg:px-0">
          {/* Figma "Service Header" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 pt-4">
            {/* No category pill here — the breadcrumb directly above already
                names it, and printing it twice in three lines is noise. */}
            <AvailabilityPill slots={service.slots} />

            <h1 className="w-full text-2xl font-semibold text-foreground lg:text-heading">
              <ThaiText>{service.title}</ThaiText>
            </h1>

            {/* Price, unit and score on one line: the three numbers a reader
                compares between two services, so they are read together. */}
            <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
              <p className="font-latin shrink-0 text-2xl font-semibold tabular-nums whitespace-nowrap text-foreground lg:text-heading">
                {price}
              </p>
              <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                {t("priceUnit", { duration })}
              </p>
              <span className="flex shrink-0 items-center gap-1 overflow-clip">
                <Star className="size-3.5 shrink-0 fill-primary text-primary" />
                <span className="font-latin text-sm font-semibold tabular-nums whitespace-nowrap text-foreground">
                  {advisor.rating}
                </span>
                <span className="font-latin text-sm font-normal tabular-nums whitespace-nowrap text-muted-foreground">
                  ({advisor.reviews})
                </span>
              </span>
            </div>

            <p className="w-full text-sm font-normal text-foreground lg:text-base">
              <ThaiText>{service.summary}</ThaiText>
            </p>
            <Button
              className="h-auto p-0 text-sm font-medium whitespace-nowrap"
              variant="link"
            >
              {t("readMore")}
            </Button>

            {/* Figma "Topics" — what can actually be asked, in the reader's own
                words. The summary says it in prose; the chips make it scannable. */}
            <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
              <p className="shrink-0 text-sm font-semibold whitespace-nowrap text-foreground">
                {t("topicsTitle")}
              </p>
              <div className="flex w-full shrink-0 flex-wrap items-start gap-2">
                {service.topics.map((topic) => (
                  <TopicChip key={topic} label={topic} />
                ))}
              </div>
            </div>
          </div>

          {/* Figma "Advisor Card" */}
          <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6">
            <Surface className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip p-4">
              <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
                <ChatAvatar crop={advisor.crop} size={56} src={advisor.avatar} />
                <div className="flex min-w-px flex-1 flex-col items-start gap-1.5 overflow-clip">
                  <p className="w-full truncate text-base font-semibold text-foreground">
                    {advisor.name}
                  </p>
                  {/* "ยืนยันตัวตนแล้ว" used to be the grey tail of the credential
                      line with a 14px shield floating beside the name. It is the
                      strongest claim on the card, so it is a pill and the
                      credential keeps the line to itself. */}
                  <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5">
                    <span className="text-xs font-normal text-muted-foreground">
                      {advisor.credential}
                    </span>
                    {advisor.verified ? (
                      <StatusPill icon={ShieldCheck} tone="success">
                        {t("verified")}
                      </StatusPill>
                    ) : null}
                  </div>
                </div>
              </div>

              <p className="w-full text-sm font-normal text-muted-foreground">
                <ThaiText>{advisor.bio}</ThaiText>
              </p>

              {/* The three counts sit *under* the card they belong to rather than
                  level with it, so the row reads as one block of evidence. */}
              <Surface
                className="flex w-full shrink-0 items-start gap-2 overflow-clip p-3"
                tier="well"
              >
                <AdvisorStat label={t("statRating")} value={advisor.rating} />
                <AdvisorStat
                  label={t("statConsultations")}
                  value={String(advisor.consultations)}
                />
                <AdvisorStat
                  label={t("statReviews")}
                  value={String(advisor.writtenReviews)}
                />
              </Surface>

              <Button
                className="h-auto p-0 text-sm font-medium whitespace-nowrap"
                nativeButton={false}
                render={<Link href={`/advisors/${advisor.id}`} />}
                variant="link"
              >
                {t("viewProfile")}
              </Button>
            </Surface>
          </div>

          {/* What the hour actually delivers, at the three lengths it is sold in.
              The summary sells the service; this is the part a reader checks
              before paying. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
            <p className={SECTION_HEAD}>{t("packagesTitle")}</p>
            {packages.map((pack) => (
              <PackageCard key={pack.key} pack={pack} />
            ))}
            <p className="w-full text-xs font-normal text-muted-foreground">
              <ThaiText>{t("packagesNote")}</ThaiText>
            </p>
          </div>

          {/* Availability, before the reader commits to the CTA — "เลือกวันและเวลา"
              is a lot easier to press once the times are visible. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <p className={cn(SECTION_HEAD, "px-6")}>{t("slotsTitle")}</p>
            <div className="flex w-full shrink-0 items-start gap-2 overflow-x-auto px-6">
              {service.slots.map((slot) => (
                <SlotChip
                  dayLabel={slot.day === "today" ? t("today") : t("tomorrow")}
                  key={`${slot.day}-${slot.time}`}
                  seatsLabel={
                    slot.seatsLeft !== undefined
                      ? t("seatsLeft", { count: slot.seatsLeft })
                      : undefined
                  }
                  slot={slot}
                />
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
            <p className={SECTION_HEAD}>{t("stepsTitle")}</p>
            <StepList />
          </div>

          {/* Figma "Reviews" */}
          {reviews.length > 0 ? (
            <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
              <div className="flex w-full shrink-0 items-center overflow-clip">
                <p className={cn(SECTION_HEAD, "min-w-px flex-1")}>
                  {t("reviewsTitle")}
                </p>
                <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
                  {reviewCountLabel}
                </p>
              </div>

              <ScoreSummary advisor={advisor} reviewCountLabel={reviewCountLabel} />

              {/* Two across at `lg`: the quotes are short and a 1200 column
                  stacking them one per row wastes the width the desktop has. */}
              <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
                {reviews.map((review) => (
                  <Surface
                    className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip p-3"
                    key={`${review.name}-${review.date}`}
                  >
                    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
                      <Image
                        alt=""
                        className="size-9 shrink-0 rounded-full object-cover"
                        height={36}
                        src={review.avatar}
                        width={36}
                      />
                      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                        <p className="w-full text-sm font-semibold text-foreground">
                          {review.name}
                        </p>
                        <p className="w-full text-xs font-normal text-muted-foreground">
                          {review.date}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 overflow-clip">
                        <Star className="size-3 shrink-0 fill-primary text-primary" />
                        <span className="font-latin text-sm font-semibold tabular-nums whitespace-nowrap text-foreground">
                          {review.rating}
                        </span>
                      </span>
                    </div>
                    <p className="w-full text-sm font-normal text-foreground">
                      <ThaiText>{review.body}</ThaiText>
                    </p>
                  </Surface>
                ))}
              </div>

              <NeutralButton block href="/reviews">
                {t("allReviews", { count: advisor.reviews })}
              </NeutralButton>
            </div>
          ) : null}

          {/* The questions this page raises — payment, refunds, what happens if
              nobody shows up — answered where they are being asked. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
            <p className={SECTION_HEAD}>{t("faqTitle")}</p>
            <FaqSection limit={4} />
          </div>

          {/* The rest of the advisor's catalogue: a reader who is not sold on
              this hour is often sold on their next one. */}
          {related.length > 0 ? (
            <div className="flex w-full shrink-0 flex-col items-start gap-3">
              <SectionHead
                action={t("relatedAll")}
                href="/search"
                title={t("relatedTitle")}
              />
              <div className="flex w-full shrink-0 items-stretch gap-3 overflow-x-auto px-6 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0">
                {related.map((s) => (
                  <RelatedCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          ) : null}
            </div>
          </div>

          {/* Figma "Booking Card" — the price, the two ways to start, and what
              is promised around them, held beside the page instead of under it.
              The phone answers the same need with the bar pinned to its bottom
              edge, which is why this is `lg`-only and that bar stops there. */}
          {/* `shadow-panel` rather than `shadow-card`: this one floats beside the
              page while the page scrolls under it, so it sits a tier above the
              cards in the column. */}
          <aside className="hidden lg:sticky lg:top-24 lg:me-6 lg:block lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-5 lg:shadow-panel">
            <p className="flex items-baseline gap-2">
              <span className="font-latin text-2xl font-semibold tabular-nums text-foreground">
                {price}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {t("perSession", { duration })}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
              {advisor.verified ? (
                <StatusPill icon={ShieldCheck} tone="success">
                  {t("verified")}
                </StatusPill>
              ) : null}
              <AvailabilityPill slots={service.slots} />
            </div>

            <ul className="flex flex-col gap-2 pt-4">
              {service.includes.map((line) => (
                <li className="flex items-start gap-2" key={line}>
                  <BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-px flex-1 text-sm font-normal text-foreground">
                    <ThaiText>{line}</ThaiText>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2.5 pt-5">
              <PrimaryButton block href="/checkout/card" size="lg">
                {t("book")}
              </PrimaryButton>
              <NeutralButton block href={`/chat/${advisor.id}`}>
                {t("message")}
              </NeutralButton>
            </div>

            <p className="pt-4 text-xs font-normal text-muted-foreground">
              <ThaiText>{t("packagesNote")}</ThaiText>
            </p>
          </aside>
        </div>

        {/* The desktop frame closes on the site footer; the phone frame ends on
            its own action bar and never had one. */}
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>

      {/* The price stays on screen with the action: on a page this long the
          reader otherwise has to scroll back up to remember what it costs. The
          desktop frame keeps it in the booking card instead. */}
      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip border-t border-border bg-card px-6 py-3 shadow-panel lg:hidden">
        <div className="flex shrink-0 flex-col items-start gap-0.5 overflow-clip">
          <p className="font-latin text-base font-semibold tabular-nums whitespace-nowrap text-foreground">
            {price}
          </p>
          <p className="text-xs font-normal whitespace-nowrap text-muted-foreground">
            {t("perSession", { duration })}
          </p>
        </div>
        <NeutralButton
          aria-label={t("message")}
          className="size-9 shrink-0 border-input px-0 shadow-none [&_svg]:size-4.5"
          href={`/chat/${advisor.id}`}
        >
          <MessageSquare />
        </NeutralButton>
        <PrimaryButton className="w-auto min-w-px flex-1" href="/checkout/card">
          {t("book")}
        </PrimaryButton>
      </div>
    </MobileScreen>
  );
}
