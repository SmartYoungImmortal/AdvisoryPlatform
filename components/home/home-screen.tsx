import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  Book,
  Brain,
  Briefcase,
  ChevronRight,
  CodeXml,
  FileText,
  type LucideIcon,
  Star,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  christopherNolan as chris,
  jamesGunn as james,
  serviceAdvisorsDesk as coverTax,
  serviceAdvisorsReview as coverBusiness,
  serviceLaptopCode as coverTech,
} from "@/lib/assets/r2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import {
  FilterButton,
  FilterChip,
  IconBadge,
  SearchField,
  SectionHead,
  ServiceMeta,
} from "@/components/home/parts";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";

/** Figma "Category / …" — a 12px-radius tile with a muted icon circle over its label. */
function CategoryCard({
  icon: Icon,
  label,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-2 overflow-clip rounded-[12px] border bg-card p-3">
      <IconBadge className="bg-muted">
        <Icon className="size-4.5 text-primary" />
      </IconBadge>
      <p className="text-xs font-normal whitespace-nowrap text-foreground">
        {label}
      </p>
    </div>
  );
}

/** Figma "Service Card" — a 240px rail card: 120px cover, title, advisor, meta. */
function ServiceCard({
  cover,
  title,
  advisor,
  avatar,
  rating,
  reviews,
  price,
}: {
  readonly cover: StaticImageData;
  readonly title: string;
  readonly advisor: string;
  readonly avatar: ReactNode;
  readonly rating: string;
  readonly reviews: string;
  readonly price: string;
}) {
  return (
    <div className="flex w-60 shrink-0 flex-col items-start gap-2 overflow-clip rounded-xl border bg-card">
      <Image alt="" className="h-30 w-full shrink-0 object-cover" src={cover} />
      <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-3 pb-3">
        <p className="w-full text-sm font-semibold text-foreground">{title}</p>
        <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
          {avatar}
          <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
            {advisor}
          </p>
        </div>
        <ServiceMeta price={price} rating={rating} reviews={reviews} />
      </div>
    </div>
  );
}

/** Figma "Advisor Card" — a 56px portrait over name, field and score. */
function AdvisorCard({
  avatar,
  name,
  field,
  rating,
}: {
  readonly avatar: ReactNode;
  readonly name: string;
  readonly field: string;
  readonly rating: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 overflow-clip rounded-xl border bg-card p-3">
      {avatar}
      <p className="text-sm font-semibold whitespace-nowrap text-foreground">
        {name}
      </p>
      <p className="text-xs font-normal whitespace-nowrap text-muted-foreground">
        {field}
      </p>
      <div className="flex shrink-0 items-center gap-1 overflow-clip">
        <Star className="size-3.5 shrink-0 text-primary" />
        <p className="text-xs font-normal whitespace-nowrap text-foreground">
          {rating}
        </p>
      </div>
    </div>
  );
}

/** Figma "Session Row" — a 44px portrait, the session line, then a time chip over the price. */
function SessionRow({
  avatar,
  title,
  meta,
  time,
  price,
}: {
  readonly avatar: ReactNode;
  readonly title: string;
  readonly meta: string;
  readonly time: string;
  readonly price: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-3 overflow-clip rounded-[12px] border bg-card p-3">
      {avatar}
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full text-sm font-semibold text-foreground">{title}</p>
        <p className="w-full text-xs font-normal text-muted-foreground">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 overflow-clip">
        <Badge className="h-auto rounded-full bg-primary/10 px-2 py-1 font-normal text-primary">
          {time}
        </Badge>
        <p className="text-sm font-semibold whitespace-nowrap text-foreground">
          {price}
        </p>
      </div>
    </div>
  );
}

/** Figma "Step" — a numbered accent circle over a 14/20 title and a 12/18 line. */
function Step({
  index,
  title,
  body,
}: {
  readonly index: string;
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="flex min-w-px flex-1 flex-col items-center gap-2 overflow-clip">
      <IconBadge className="bg-primary/10">
        <p className="text-sm font-semibold text-primary">{index}</p>
      </IconBadge>
      <p className="w-full text-center text-sm font-semibold text-foreground">
        {title}
      </p>
      <p className="w-full text-center text-xs font-normal text-muted-foreground">
        {body}
      </p>
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
 */
export function HomeScreen() {
  const t = useTranslations("home");
  const c = useTranslations("common");

  return (
    <MobileScreen>
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
                placeholder={t("searchPlaceholder")}
                readOnly
              />
              <FilterButton label={c("filters")} />
            </div>
            <div className="flex w-full shrink-0 items-start gap-2 overflow-x-auto">
              <FilterChip active>{t("filterToday")}</FilterChip>
              <FilterChip>{t("filterBudget")}</FilterChip>
              <FilterChip>{t("filterRating")}</FilterChip>
            </div>
          </div>

          {/* Figma "Categories" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <SectionHead
              action={t("seeAll")}
              href="/search"
              title={t("categories")}
            />
            <div className="flex w-full shrink-0 items-start gap-2 overflow-x-auto px-6">
              <CategoryCard icon={Briefcase} label={t("categoryBusiness")} />
              <CategoryCard icon={Wallet} label={t("categoryFinance")} />
              <CategoryCard icon={FileText} label={t("categoryLegal")} />
              <CategoryCard icon={Book} label={t("categoryEducation")} />
              <CategoryCard icon={Brain} label={t("categoryWellbeing")} />
              <CategoryCard icon={CodeXml} label={t("categoryTech")} />
            </div>
          </div>

          {/* Figma "Matching Card" — the accent block that opens the matching flow.
              Its icon badge is white-on-white in Figma, which renders as an empty
              circle; the glyph is drawn in the accent here so it is actually
              visible, mirroring the promo card below it. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6">
            <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-primary p-4">
              <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
                <IconBadge className="bg-primary-foreground">
                  <Brain className="size-4.5 text-primary" />
                </IconBadge>
                <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip text-primary-foreground">
                  <p className="w-full text-base font-semibold">
                    {t("matchTitle")}
                  </p>
                  <p className="w-full text-sm font-normal opacity-85">
                    <ThaiText>{t("matchBody")}</ThaiText>
                  </p>
                </div>
              </div>
              <Button
                className="h-auto w-full gap-1 rounded-lg border-0 bg-card px-4 py-2.5 font-semibold text-primary shadow-none hover:bg-card"
                nativeButton={false}
                render={<Link href="/matching" />}
              >
                {t("matchCta")}
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Figma "Promo Card" */}
          <div className="flex w-full shrink-0 items-start px-6">
            <div className="flex min-w-px flex-1 items-center gap-3 overflow-clip rounded-xl bg-primary/10 p-4">
              <IconBadge className="bg-primary">
                <Brain className="size-4.5 text-primary-foreground" />
              </IconBadge>
              <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
                <p className="w-full text-base font-semibold text-foreground">
                  {t("promoTitle")}
                </p>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  <ThaiText>{t("promoBody")}</ThaiText>
                </p>
              </div>
            </div>
          </div>

          {/* Figma "How to use" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6">
            <p className="w-full text-base font-semibold text-foreground">
              {t("stepsTitle")}
            </p>
            <div className="flex w-full shrink-0 items-start gap-3">
              <Step body={t("step1Body")} index="1" title={t("step1Title")} />
              <Step body={t("step2Body")} index="2" title={t("step2Title")} />
              <Step body={t("step3Body")} index="3" title={t("step3Title")} />
            </div>
          </div>

          {/* Figma "Suggested" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <SectionHead
              action={t("seeAll")}
              href="/search"
              title={t("suggested")}
            />
            <div className="flex w-full shrink-0 items-start gap-3 overflow-x-auto px-6">
              <ServiceCard
                advisor={t("s1Advisor")}
                avatar={<ChatAvatar size={20} />}
                cover={coverTax}
                price={t("s1Price")}
                rating={t("s1Rating")}
                reviews={t("s1Reviews")}
                title={t("s1Title")}
              />
              <ServiceCard
                advisor={t("s2Advisor")}
                avatar={<ChatAvatar crop={false} size={20} src={chris} />}
                cover={coverBusiness}
                price={t("s2Price")}
                rating={t("s2Rating")}
                reviews={t("s2Reviews")}
                title={t("s2Title")}
              />
              <ServiceCard
                advisor={t("s3Advisor")}
                avatar={<ChatAvatar crop={false} size={20} src={james} />}
                cover={coverTech}
                price={t("s3Price")}
                rating={t("s3Rating")}
                reviews={t("s3Reviews")}
                title={t("s3Title")}
              />
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
              <AdvisorCard
                avatar={<ChatAvatar size={56} />}
                field={t("a1Field")}
                name={t("a1Name")}
                rating={t("a1Rating")}
              />
              <AdvisorCard
                avatar={<ChatAvatar crop={false} size={56} src={chris} />}
                field={t("a2Field")}
                name={t("a2Name")}
                rating={t("a2Rating")}
              />
              <AdvisorCard
                avatar={<ChatAvatar crop={false} size={56} src={james} />}
                field={t("a3Field")}
                name={t("a3Name")}
                rating={t("a3Rating")}
              />
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
            <SessionRow
              avatar={<ChatAvatar crop={false} size={44} src={chris} />}
              meta={t("n1Meta")}
              price={t("n1Price")}
              time={t("n1Time")}
              title={t("n1Title")}
            />
            <SessionRow
              avatar={<ChatAvatar size={44} />}
              meta={t("n2Meta")}
              price={t("n2Price")}
              time={t("n2Time")}
              title={t("n2Title")}
            />
            <SessionRow
              avatar={<ChatAvatar crop={false} size={44} src={james} />}
              meta={t("n3Meta")}
              price={t("n3Price")}
              time={t("n3Time")}
              title={t("n3Title")}
            />
          </div>
        </div>
      </ScreenBody>
      <BottomBar role="user" selected="home" />
    </MobileScreen>
  );
}
