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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { FaqSection } from "@/components/marketing/faq-section";
import { SectionHead } from "@/components/home/parts";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { ServiceGallery } from "@/components/service/service-gallery";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/** Figma "Topic Chip" — a muted pill, 12/18, that says what fits in the hour. */
function TopicChip({ label }: { readonly label: string }) {
  return (
    <span className="flex shrink-0 items-start rounded-full bg-muted px-2.5 py-1 text-xs font-normal whitespace-nowrap text-muted-foreground">
      {label}
    </span>
  );
}

/** Figma "Stat" — a value over its label, each third of the advisor card's row. */
function AdvisorStat({
  value,
  label,
}: {
  readonly value: string;
  readonly label: string;
}) {
  return (
    <div className="flex min-w-px flex-1 flex-col items-center gap-1 overflow-clip text-center">
      <p className="w-full text-sm font-semibold text-foreground">{value}</p>
      <p className="w-full text-xs font-normal text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Figma "Dist Row" — a 6px track whose fill is the share of ratings at that star.
 * The five rows together are the shape of the score, which a bare "4.9" hides:
 * an average sits in the same place whether the tail is empty or full of ones.
 */
function DistributionRow({
  label,
  fill,
}: {
  readonly label: string;
  readonly fill: number;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
      <span className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
        {label}
      </span>
      <div className="h-1.5 min-w-px flex-1 overflow-clip rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${fill}%` }} />
      </div>
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
    <div className="flex w-full shrink-0 items-center gap-4 overflow-clip rounded-xl border bg-card p-4">
      <div className="flex shrink-0 flex-col items-center gap-1 overflow-clip">
        <p className="text-heading font-semibold whitespace-nowrap text-foreground">
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
    </div>
  );
}

/** One bookable time. The seat count only prints when it is low enough to matter. */
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
    <div className="flex shrink-0 flex-col items-start gap-0.5 rounded-lg border bg-card px-3 py-2">
      <p className="text-sm font-semibold whitespace-nowrap text-foreground">
        {dayLabel} {slot.time}
      </p>
      {seatsLabel ? (
        <p className="text-xs font-normal whitespace-nowrap text-primary">
          {seatsLabel}
        </p>
      ) : null}
    </div>
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
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl border bg-card p-4",
        pack.recommended && "border-primary",
      )}
    >
      <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
        <p className="shrink-0 text-sm font-semibold whitespace-nowrap text-foreground">
          {t(PACKAGE_LABEL[pack.key])}
        </p>
        {pack.recommended ? (
          <Badge className="h-auto shrink-0 rounded-full border-0 bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
            {t("pkgRecommended")}
          </Badge>
        ) : null}
        <p className="min-w-px flex-1 text-right text-xs font-normal whitespace-nowrap text-muted-foreground">
          {formatDuration(pack.minutes)}
        </p>
      </div>

      <p className="w-full text-2xl font-semibold text-foreground">
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

      {pack.recommended ? (
        <PrimaryButton href="/checkout/card">{t("pkgSelect")}</PrimaryButton>
      ) : (
        <NeutralButton href="/checkout/card">{t("pkgSelect")}</NeutralButton>
      )}
    </div>
  );
}

/**
 * The four steps between opening this page and the money reaching the advisor.
 * The copy is the landing page's, verbatim: a reader who arrives here from a
 * search has never seen it, and it is the answer to "how does paying work".
 */
function StepList() {
  const t = useTranslations("landing");
  const steps = [1, 2, 3, 4] as const;

  return (
    <ol className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl border bg-card p-4">
      {steps.map((n) => (
        <li className="flex w-full shrink-0 items-start gap-3 overflow-clip" key={n}>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {n}
          </span>
          <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
            <p className="w-full text-sm font-semibold text-foreground">
              {t(`step${n}Title`)}
            </p>
            <p className="w-full text-xs font-normal text-muted-foreground">
              <ThaiText>{t(`step${n}Body`)}</ThaiText>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A sibling consultation, as a card in the rail at the foot of the page. */
function RelatedCard({ service }: { readonly service: Service }) {
  const format = useFormatter();

  return (
    <Link
      className="flex w-40 shrink-0 flex-col items-start overflow-clip rounded-xl border bg-card"
      href={`/service/${service.id}`}
    >
      <Image alt="" className="aspect-video w-full object-cover" src={service.cover} />
      <div className="flex w-full flex-1 flex-col items-start gap-1 p-3">
        <p className="line-clamp-2 w-full text-sm font-semibold text-foreground">
          {service.title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {formatDuration(service.minutes)}
        </p>
        <p className="w-full text-sm font-semibold text-foreground">
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

  const service = getService(serviceId);
  const advisor = service ? getAdvisor(service.advisorId) : undefined;

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
    <MobileScreen className="pb-0">
      <ScreenBody>
        {/* The app's own nav bar, solid and above the gallery rather than floated
            over it: these covers are stock photography with no safe area, and a
            reversed lockup disappears into the light half of the crop. No back
            control — the breadcrumb under it is what goes back. */}
        <TopBar unreadNotifications />

        {/* Where the reader is. A search result drops them here with no idea
            which corner of the catalogue they landed in. */}
        <div className="w-full shrink-0 px-6 py-3">
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

        <ServiceGallery photos={service.gallery} />

        <div className="flex w-full shrink-0 flex-col items-center gap-6 pb-6">
          {/* Figma "Service Header" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 pt-4">
            <h1 className="w-full text-2xl font-semibold text-foreground">
              <ThaiText>{service.title}</ThaiText>
            </h1>

            {/* Price, unit and score on one line: the three numbers a reader
                compares between two services, so they are read together. */}
            <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
              <p className="shrink-0 text-2xl font-semibold whitespace-nowrap text-foreground">
                {price}
              </p>
              <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                {t("priceUnit", { duration })}
              </p>
              <span className="flex shrink-0 items-center gap-1 overflow-clip">
                <Star className="size-3.5 shrink-0 fill-primary text-primary" />
                <span className="text-sm font-semibold whitespace-nowrap text-foreground">
                  {advisor.rating}
                </span>
                <span className="text-sm font-normal whitespace-nowrap text-muted-foreground">
                  ({advisor.reviews})
                </span>
              </span>
            </div>

            <p className="w-full text-sm font-normal text-muted-foreground">
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
            <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl border bg-card p-4">
              <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
                <ChatAvatar crop={advisor.crop} size={56} src={advisor.avatar} />
                <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
                  <div className="flex w-full shrink-0 items-center gap-1 overflow-clip">
                    <p className="shrink-0 text-base font-semibold whitespace-nowrap text-foreground">
                      {advisor.name}
                    </p>
                    {advisor.verified ? (
                      <ShieldCheck
                        aria-label={t("verified")}
                        className="size-3.5 shrink-0 text-primary"
                        role="img"
                      />
                    ) : null}
                  </div>
                  <p className="w-full text-xs font-normal text-muted-foreground">
                    {t("credentialLine", { credential: advisor.credential })}
                  </p>
                </div>
              </div>

              <p className="w-full text-sm font-normal text-muted-foreground">
                <ThaiText>{advisor.bio}</ThaiText>
              </p>

              <div className="h-px w-full shrink-0 bg-border" />

              <div className="flex w-full shrink-0 items-start gap-2 overflow-clip">
                <AdvisorStat label={t("statRating")} value={advisor.rating} />
                <AdvisorStat
                  label={t("statConsultations")}
                  value={String(advisor.consultations)}
                />
                <AdvisorStat
                  label={t("statReviews")}
                  value={String(advisor.writtenReviews)}
                />
              </div>

              <Button
                className="h-auto p-0 text-sm font-medium whitespace-nowrap"
                nativeButton={false}
                render={<Link href={`/chat/${advisor.id}`} />}
                variant="link"
              >
                {t("viewProfile")}
              </Button>
            </div>
          </div>

          {/* What the hour actually delivers, at the three lengths it is sold in.
              The summary sells the service; this is the part a reader checks
              before paying. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
            <p className="w-full text-base font-semibold text-foreground">
              {t("packagesTitle")}
            </p>
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
            <p className="w-full px-6 text-base font-semibold text-foreground">
              {t("slotsTitle")}
            </p>
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
            <p className="w-full text-base font-semibold text-foreground">
              {t("stepsTitle")}
            </p>
            <StepList />
          </div>

          {/* Figma "Reviews" */}
          {reviews.length > 0 ? (
            <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
              <div className="flex w-full shrink-0 items-center overflow-clip">
                <p className="min-w-px flex-1 text-base font-semibold text-foreground">
                  {t("reviewsTitle")}
                </p>
                <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
                  {reviewCountLabel}
                </p>
              </div>

              <ScoreSummary advisor={advisor} reviewCountLabel={reviewCountLabel} />

              {reviews.map((review) => (
                <div
                  className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-xl border bg-card p-3"
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
                      <span className="text-sm font-semibold whitespace-nowrap text-foreground">
                        {review.rating}
                      </span>
                    </span>
                  </div>
                  <p className="w-full text-sm font-normal text-muted-foreground">
                    <ThaiText>{review.body}</ThaiText>
                  </p>
                </div>
              ))}

              <NeutralButton
                className="h-auto rounded-xl bg-transparent py-3 shadow-none"
                href="/reviews"
              >
                {t("allReviews", { count: advisor.reviews })}
              </NeutralButton>
            </div>
          ) : null}

          {/* The questions this page raises — payment, refunds, what happens if
              nobody shows up — answered where they are being asked. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
            <p className="w-full text-base font-semibold text-foreground">
              {t("faqTitle")}
            </p>
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
              <div className="flex w-full shrink-0 items-stretch gap-3 overflow-x-auto px-6">
                {related.map((s) => (
                  <RelatedCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </ScreenBody>

      {/* The price stays on screen with the action: on a page this long the
          reader otherwise has to scroll back up to remember what it costs. */}
      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip border-t bg-card px-6 py-3">
        <div className="flex shrink-0 flex-col items-start gap-0.5 overflow-clip">
          <p className="text-base font-semibold whitespace-nowrap text-foreground">
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
