import Image from "next/image";
import Link from "next/link";
import {
  Book,
  Brain,
  Briefcase,
  CodeXml,
  FileText,
  type LucideIcon,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  advisorList,
  formatDuration,
  getAdvisor,
  leadService,
  priceFrom,
  services,
  soonestSlots,
  type Advisor,
  type Service,
  type Slot,
} from "@/lib/catalogue/services";
import { Badge } from "@/components/ui/badge";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { AutoScrollRail } from "@/components/home/auto-scroll-rail";
import { HomeIntro } from "@/components/home/intro";
import { TypingPlaceholder } from "@/components/home/typing-placeholder";
import { HowToUse } from "@/components/home/how-to-use";
import { VettingSection } from "@/components/home/vetting";
import { FaqSection } from "@/components/marketing/faq-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  FilterButton,
  IconBadge,
  SearchField,
  SectionHead,
  ServicePrice,
  ServiceProof,
  VerifiedTick,
} from "@/components/home/parts";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * A band of the desktop frame: the 1200 column, inset 120 from a 1440 page.
 * Below `lg` it is the phone's full-bleed block and the inset lives on the
 * content, which is why the padding is only added from the breakpoint up.
 */
const SECTION =
  "flex w-full shrink-0 flex-col items-start lg:mx-auto lg:max-w-[1440px] lg:px-10 xl:px-30";

/**
 * The six the catalogue is filed under. One list, drawn twice: as the phone's
 * rail of icon tiles, and as the desktop hero's row of pills.
 */
const CATEGORIES = [
  { icon: Briefcase, label: "categoryBusiness" },
  { icon: Wallet, label: "categoryFinance" },
  { icon: FileText, label: "categoryLegal" },
  { icon: Book, label: "categoryEducation" },
  { icon: Brain, label: "categoryWellbeing" },
  { icon: CodeXml, label: "categoryTech" },
] as const;

/**
 * Figma "Category / …" — a 12px-radius tile with a muted icon circle over its
 * label.
 *
 * The box is dropped here. This page is already a column of bordered white cards
 * on a near-white ground (services, advisors, sessions), and six more of them
 * turned the rail into another row of the same object. The circle is what names
 * the category, so it carries the tile on its own and picks up the accent tint
 * the muted grey was too close to the page to give it.
 */
function CategoryCard({
  icon: Icon,
  label,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
}) {
  return (
    <Link
      className="flex shrink-0 flex-col items-center gap-2 rounded-lg px-2 py-1"
      href="/search"
    >
      <IconBadge className="size-12 bg-primary/10">
        <Icon className="size-5 text-primary" />
      </IconBadge>
      <span className="text-xs font-normal whitespace-nowrap text-foreground">
        {label}
      </span>
    </Link>
  );
}

/**
 * Figma "Categories" (1564:24876) — the same six, as pills under the desktop
 * hero's search field: 38px tall, a border hairline on the card surface, 16px
 * of side padding and 10px apart. The icon is dropped there; the frame sets
 * them as text alone, which is what keeps the row reading as one line under the
 * field rather than as a second block of content.
 */
function CategoryChip({ label }: { readonly label: string }) {
  return (
    <Link
      className="flex h-9.5 shrink-0 items-center rounded-full border border-border bg-card px-4 text-sm leading-5 font-normal whitespace-nowrap text-foreground transition-colors hover:border-primary/40 hover:text-primary"
      href="/search"
    >
      {label}
    </Link>
  );
}

/**
 * Figma "Service Card" — a 240px rail card: 120px cover, title, advisor, meta.
 *
 * Two things arrive with the catalogue. It is a link, where before it was an
 * inert `<div>` because there was no service route to point at. And it carries
 * the proof and the offer on separate lines: score and completed bookings above,
 * duration and price below. The duration is the part that had been missing
 * everywhere but the search results — an hour of someone's time priced at
 * ฿1,200 reads very differently from an unlabelled ฿1,200.
 */
function ServiceCard({ service }: { readonly service: Service }) {
  const advisor = getAdvisor(service.advisorId);
  if (!advisor) return null;

  return (
    // Figma "Grid" (1564:24893) lays the same card out four across a 1200
    // column: 282 wide on a 160px cover, against the 240/120 the rail uses.
    <Link
      className="flex w-60 shrink-0 flex-col items-start gap-2 overflow-clip rounded-xl border bg-card lg:w-full"
      href={`/service/${service.id}`}
    >
      <Image
        alt=""
        className="h-30 w-full shrink-0 object-cover lg:h-40"
        src={service.cover}
      />
      <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-3 pb-3">
        <span className="line-clamp-2 w-full text-sm font-semibold text-foreground">
          <ThaiText>{service.title}</ThaiText>
        </span>
        {/* The tick rides with the name rather than at the far edge of the row,
            where a flex-1 name left it stranded like a stray dot. */}
        <span className="flex w-full shrink-0 items-center gap-1.5 overflow-clip">
          <ChatAvatar crop={advisor.crop} size={20} src={advisor.avatar} />
          <span className="flex min-w-px flex-1 items-center gap-1 overflow-clip">
            <span className="min-w-px truncate text-xs font-normal text-muted-foreground">
              {advisor.name}
            </span>
            {advisor.verified ? <VerifiedTick /> : null}
          </span>
        </span>
        <ServiceProof
          bookings={service.bookings}
          rating={advisor.rating}
          reviews={advisor.reviews}
        />
        <ServicePrice minutes={service.minutes} price={service.price} />
      </div>
    </Link>
  );
}

/**
 * Figma "Advisor Card" — a 56px portrait over name, field and score.
 *
 * The thinnest card on the page: it named someone and scored them, then left the
 * reader with no way to find out what they charge or how to reach them. It now
 * carries the verified tick, the review count behind the score and the price
 * their cheapest consultation starts at.
 *
 * It links to that advisor's most-booked consultation rather than to a profile,
 * because there is no public advisor route yet — see `leadService`.
 */
function AdvisorCard({ advisor }: { readonly advisor: Advisor }) {
  const lead = leadService(advisor.id);
  if (!lead) return null;

  return (
    // Figma "Advisors" (1564:24946): six across the 1200 column, 183 wide with
    // a 64px portrait, where the rail card is 144 on a 56.
    <Link
      className="flex w-36 shrink-0 flex-col items-center gap-2 overflow-clip rounded-xl border bg-card p-3 lg:w-full lg:py-5"
      href={`/service/${lead.id}`}
    >
      <ChatAvatar
        className="lg:size-16!"
        crop={advisor.crop}
        size={56}
        src={advisor.avatar}
      />
      <span className="flex w-full shrink-0 items-center justify-center gap-1 overflow-clip">
        <span className="truncate text-sm font-semibold text-foreground">
          {advisor.name}
        </span>
        {advisor.verified ? <VerifiedTick /> : null}
      </span>
      <span className="w-full truncate text-center text-xs font-normal text-muted-foreground">
        {advisor.field}
      </span>
      <ServiceProof rating={advisor.rating} reviews={advisor.reviews} />
      <ServicePrice from price={priceFrom(advisor.id)} />
    </Link>
  );
}

/**
 * Figma "Session Row" — a 44px portrait, the session line, then a time chip over
 * the price.
 *
 * Figma boxes each row separately, so three consecutive sessions arrive as three
 * identical cards. They are one list, so they are drawn as one: the card and its
 * radius move up to `SessionList` and the rows are separated by the hairline they
 * were already carrying as a border.
 *
 * The row used to show a time and a price with no way to take either. It is now
 * the slot's link, and a slot with one place left says so — the only urgency on
 * this page that is a fact rather than a device.
 */
function SessionRow({
  service,
  slot,
}: {
  readonly service: Service;
  readonly slot: Slot;
}) {
  const t = useTranslations("service");
  const advisor = getAdvisor(service.advisorId);
  if (!advisor) return null;

  return (
    // On the phone these are rows inside one card; Figma's desktop "Row"
    // (1564:25024) splits them into three cards across the column, so each row
    // takes its own border and surface from `lg`.
    <Link
      className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3 lg:rounded-xl lg:border lg:bg-card lg:p-4"
      href={`/service/${service.id}`}
    >
      <ChatAvatar crop={advisor.crop} size={44} src={advisor.avatar} />
      <span className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <span className="w-full truncate text-sm font-semibold text-foreground">
          {service.title}
        </span>
        <span className="w-full truncate text-xs font-normal text-muted-foreground">
          {advisor.name} · {formatDuration(service.minutes)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 overflow-clip">
        <Badge className="h-auto rounded-full bg-primary/10 px-2 py-1 font-normal text-primary">
          {slot.day === "today" ? t("today") : t("tomorrow")} {slot.time}
        </Badge>
        {slot.seatsLeft !== undefined ? (
          <span className="text-xs font-normal whitespace-nowrap text-muted-foreground">
            {t("seatsLeft", { count: slot.seatsLeft })}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * Figma "Promos" (1564:24991, 1564:24996) — a 174px panel: 28px inset, a 20/28
 * title, a line of body, and a 46px call to action. The accent one is the
 * primary fill with its own surface as the button; the quiet one is the same
 * accent at a tenth, so the pair reads as one offer and its alternative.
 *
 * Desktop only, as the frame has it: the phone home already answers both of
 * these — matching from the search field, the trial from a service page.
 */
function Promo({
  title,
  body,
  cta,
  href,
  tone,
}: {
  readonly title: string;
  readonly body: string;
  readonly cta: string;
  readonly href: string;
  readonly tone: "primary" | "muted";
}) {
  const accent = tone === "primary";
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2.5 rounded-xl p-7",
        accent ? "bg-primary" : "bg-primary/10",
      )}
    >
      <p
        className={cn(
          "text-xl leading-7 font-semibold",
          accent ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "text-sm leading-5 font-normal",
          accent ? "text-primary-foreground/85" : "text-muted-foreground",
        )}
      >
        <ThaiText>{body}</ThaiText>
      </p>
      <Link
        className={cn(
          "mt-1.5 flex h-11.5 items-center rounded-lg px-5.5 text-base font-medium transition-opacity hover:opacity-90",
          accent
            ? "bg-card text-primary"
            : "bg-primary text-primary-foreground",
        )}
        href={href}
      >
        {cta}
      </Link>
    </div>
  );
}

/** The card that holds the "Available Soon" sessions — see `SessionRow`. */
function SessionList({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-stretch divide-y overflow-clip rounded-xl border bg-card lg:grid lg:grid-cols-3 lg:gap-6 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
      {children}
    </div>
  );
}

/**
 * Figma "Home (Light)" — 1155:17276.
 *
 * The frame's status bar and home indicator are not reproduced: this app draws
 * no mock OS chrome. Its nav bar and tab bar are the shared `TopBar`/`BottomBar`,
 * so the lockup and tab metrics stay identical to every other screen.
 *
 * The three rails (categories, suggested services, top advisors) are clipped in
 * Figma because a static frame cannot scroll. In the browser they scroll
 * horizontally, with the 24px page inset kept as the rail's own padding so the
 * first and last card still line up with the copy above them.
 *
 * Every record on this page now comes from `lib/catalogue/services`, which is
 * also what `/search` and `/service/[id]` read. Before that the same three
 * services were spelled out twice in `messages/th.json` — once for this screen,
 * once for the results screen — with no id tying them together, which is why
 * nothing on either screen could link anywhere.
 */
export function HomeScreen() {
  const t = useTranslations("home");
  const c = useTranslations("common");
  // next-intl does not carry arrays through a message file, and it types message
  // keys as a literal union, so the examples are spelled out rather than built
  // from a template literal.
  const searchExamples = [
    t("searchExample1"),
    t("searchExample2"),
    t("searchExample3"),
    t("searchExample4"),
    t("searchExample5"),
  ];
  // Three fill the phone's rail; Figma's desktop grid is four across.
  const suggested = services.slice(0, 4);
  const upcoming = soonestSlots(3);

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="relative isolate">
        <TopBar unreadNotifications />
        {/* The wash belongs to the top of the page, not to the frame: absolutely
            positioned inside the scroll container it travels with the content and
            leaves as you scroll, the way the hero it is modelled on does. `-z-10`
            keeps it under the copy — a positioned element otherwise paints above
            in-flow text — and `isolate` on the scroller confines that negative
            layer, which would otherwise sink behind the frame's own background.

            Figma's desktop hero (1564:24866) is a 390px band that ends on a
            hard edge against the sections below it, so the wash stops there
            rather than fading over the first grid. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-hero-wash lg:h-[458px]"
        />

        {/* Figma "Page Content" — 8px above the first block, 24px between them.
            The desktop frame runs on a 56px rhythm between its bands instead. */}
        <div className="flex w-full shrink-0 flex-col items-center gap-6 pt-2 pb-6 lg:gap-14 lg:pt-0 lg:pb-14">
          <HomeIntro>
          {/* Figma "Search Block" — the phone's title and field. The desktop
              frame turns the same block into the hero: a centred 720 column
              with a headline, a line of subhead and a 64px field whose search
              button lives inside it. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6 lg:mx-auto lg:max-w-[720px] lg:items-center lg:gap-4 lg:px-0 lg:pt-18">
            <h1 className="w-full text-2xl font-semibold text-foreground lg:text-center lg:text-display">
              <span className="lg:hidden">{t("searchTitle")}</span>
              <span className="hidden lg:inline">{t("heroTitle")}</span>
            </h1>
            <p className="hidden w-full text-center text-lg leading-7 font-normal text-muted-foreground lg:block">
              {t("heroSubtitle")}
            </p>
            <div className="flex w-full shrink-0 items-start gap-2">
              <SearchField
                aria-label={t("searchPlaceholder")}
                groupClassName="lg:h-16 lg:rounded-xl lg:px-5"
                href="/search"
                inputClassName="lg:text-base"
                linkLabel={c("search")}
                overlay={<TypingPlaceholder phrases={searchExamples} />}
                placeholder={t("searchPlaceholder")}
                readOnly
                trailing={
                  <span className="hidden h-12 shrink-0 items-center rounded-lg bg-primary px-7 text-base font-medium text-primary-foreground lg:flex">
                    {c("search")}
                  </span>
                }
              />
              <FilterButton className="lg:hidden" label={c("filters")} />
            </div>
          </div>

          {/* Figma "Categories" — a rail of icon tiles under its own head on the
              phone, the hero's row of pills on the desktop frame, where the
              head is gone because the row sits under the field it filters. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 lg:mx-auto lg:max-w-[720px] lg:items-center lg:gap-0">
            <SectionHead
              action={t("seeAll")}
              className="lg:hidden"
              href="/search"
              title={t("categories")}
            />
            <AutoScrollRail className="px-6 lg:hidden">
              {CATEGORIES.map(({ icon, label }) => (
                <CategoryCard icon={icon} key={label} label={t(label)} />
              ))}
            </AutoScrollRail>
            <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:justify-center lg:gap-2.5">
              {CATEGORIES.map(({ label }) => (
                <CategoryChip key={label} label={t(label)} />
              ))}
            </div>
          </div>

          {/* Figma "Suggested" / "Suggested Services" — a rail of three on the
              phone, four across the 1200 column on the desktop frame. */}
          <div className={cn(SECTION, "gap-3 lg:gap-6")}>
            <SectionHead
              action={t("seeAll")}
              className="lg:px-0"
              href="/search"
              title={t("suggested")}
            />
            <div className="flex w-full shrink-0 items-start gap-3 overflow-x-auto px-6 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
              {suggested.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>

          {/* Figma "Top Advisors" — six across the column on the desktop frame. */}
          <div className={cn(SECTION, "gap-3 lg:gap-6")}>
            <SectionHead
              action={t("seeAll")}
              className="lg:px-0"
              href="/search"
              title={t("topAdvisors")}
            />
            <div className="flex w-full shrink-0 items-start gap-3 overflow-x-auto px-6 lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible lg:px-0">
              {advisorList.map((advisor) => (
                <AdvisorCard advisor={advisor} key={advisor.id} />
              ))}
            </div>
          </div>

          {/* Figma "Promos" (1564:24989) — two panels the phone frame has no
              room for: the matching flow, and the free trial consultation. */}
          <div className={cn(SECTION, "hidden lg:grid lg:grid-cols-2 lg:gap-6")}>
            <Promo
              body={t("promoMatchBody")}
              cta={t("promoMatchCta")}
              href="/matching"
              title={t("promoMatchTitle")}
              tone="primary"
            />
            <Promo
              body={t("promoTrialBody")}
              cta={t("promoTrialCta")}
              href="/search"
              title={t("promoTrialTitle")}
              tone="muted"
            />
          </div>

          {/* Figma "Available Soon" — the one section whose head keeps the page
              inset instead of hanging it on a rail. */}
          <div className={cn(SECTION, "gap-3 px-6 lg:gap-6")}>
            <SectionHead
              action={t("seeAll")}
              className="px-0"
              href="/search"
              title={t("availableSoon")}
            />
            <SessionList>
              {upcoming.map(({ service, slot }) => (
                <SessionRow
                  key={`${service.id}-${slot.day}-${slot.time}`}
                  service={service}
                  slot={slot}
                />
              ))}
            </SessionList>
          </div>

          {/* The blocks below existed only on `/landing` — the page a reader
              sees once, before they have an account, and never again. The four
              steps, the vetting promise, the questions and the site links are
              exactly what someone deciding whether to book needs, so they close
              this page too. */}
          <HowToUse />

          <VettingSection />

          <div className={cn(SECTION, "gap-3 px-6 lg:gap-6")}>
            <SectionHead
              action={t("faqAll")}
              className="px-0"
              href="/landing#faq"
              title={t("faqTitle")}
            />
            <FaqSection limit={5} />
          </div>
          </HomeIntro>
        </div>

        {/* Runs under the tab bar, which is what the bar frosts against. The
            desktop frame has no tab bar to clear, so the inset goes with it. */}
        <SiteFooter className="pb-[101px] lg:pb-0" />
      </ScreenBody>
      {/* Figma's desktop nav carries these destinations itself — see `TopBar`. */}
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}
