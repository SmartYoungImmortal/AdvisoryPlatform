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
    <Link
      className="flex w-60 shrink-0 flex-col items-start gap-2 overflow-clip rounded-xl border bg-card"
      href={`/service/${service.id}`}
    >
      <Image
        alt=""
        className="h-30 w-full shrink-0 object-cover"
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
    <Link
      className="flex w-36 shrink-0 flex-col items-center gap-2 overflow-clip rounded-xl border bg-card p-3"
      href={`/service/${lead.id}`}
    >
      <ChatAvatar crop={advisor.crop} size={56} src={advisor.avatar} />
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
    <Link
      className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3"
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

/** The card that holds the "Available Soon" sessions — see `SessionRow`. */
function SessionList({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-stretch divide-y overflow-clip rounded-xl border bg-card">
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
  const suggested = services.slice(0, 3);
  const upcoming = soonestSlots(3);

  return (
    <MobileScreen className="pb-0">
      <ScreenBody className="relative isolate">
        <TopBar unreadNotifications />
        {/* The wash belongs to the top of the page, not to the frame: absolutely
            positioned inside the scroll container it travels with the content and
            leaves as you scroll, the way the hero it is modelled on does. `-z-10`
            keeps it under the copy — a positioned element otherwise paints above
            in-flow text — and `isolate` on the scroller confines that negative
            layer, which would otherwise sink behind the frame's own background. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-hero-wash"
        />

        {/* Figma "Page Content" — 8px above the first block, 24px between them. */}
        <div className="flex w-full shrink-0 flex-col items-center gap-6 pt-2 pb-6">
          <HomeIntro>
          {/* Figma "Search Block" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6">
            <h1 className="w-full text-2xl font-semibold text-foreground">
              {t("searchTitle")}
            </h1>
            <div className="flex w-full shrink-0 items-start gap-2">
              <SearchField
                aria-label={t("searchPlaceholder")}
                href="/search"
                linkLabel={c("search")}
                overlay={<TypingPlaceholder phrases={searchExamples} />}
                placeholder={t("searchPlaceholder")}
                readOnly
              />
              <FilterButton label={c("filters")} />
            </div>
          </div>

          {/* Figma "Categories" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <SectionHead
              action={t("seeAll")}
              href="/search"
              title={t("categories")}
            />
            <AutoScrollRail className="px-6">
              <CategoryCard icon={Briefcase} label={t("categoryBusiness")} />
              <CategoryCard icon={Wallet} label={t("categoryFinance")} />
              <CategoryCard icon={FileText} label={t("categoryLegal")} />
              <CategoryCard icon={Book} label={t("categoryEducation")} />
              <CategoryCard icon={Brain} label={t("categoryWellbeing")} />
              <CategoryCard icon={CodeXml} label={t("categoryTech")} />
            </AutoScrollRail>
          </div>

          {/* Figma "Suggested" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <SectionHead
              action={t("seeAll")}
              href="/search"
              title={t("suggested")}
            />
            <div className="flex w-full shrink-0 items-start gap-3 overflow-x-auto px-6">
              {suggested.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>

          {/* Figma "Top Advisors" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <SectionHead
              action={t("seeAll")}
              href="/search"
              title={t("topAdvisors")}
            />
            <div className="flex w-full shrink-0 items-start gap-3 overflow-x-auto px-6">
              {advisorList.map((advisor) => (
                <AdvisorCard advisor={advisor} key={advisor.id} />
              ))}
            </div>
          </div>

          {/* Figma "Available Soon" — the one section whose head keeps the page
              inset instead of hanging it on a rail. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6">
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

          <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6">
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

        {/* Runs under the tab bar, which is what the bar frosts against. */}
        <SiteFooter className="pb-[101px]" />
      </ScreenBody>
      <BottomBar role="user" selected="home" />
    </MobileScreen>
  );
}
