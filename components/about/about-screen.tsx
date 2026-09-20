import Link from "next/link";
import {
  BadgeCheck,
  Book,
  Brain,
  Briefcase,
  CalendarClock,
  Check,
  ChevronRight,
  CodeXml,
  FileCheck,
  FileText,
  MessageSquare,
  ShieldCheck,
  Video,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { AboutPhoto } from "@/components/about/photo";
import { Reveal, type RevealFrom } from "@/components/about/reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PrimaryButton, NeutralButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { TopBar } from "@/components/topbar";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * `/about` — what this product is, why it exists, and who is behind it.
 *
 * The section rhythm is adapted from the Buono Group site
 * (`buonogroup-fe/app/pages/about-us.vue` and the eleven components it
 * composes), with a look at the shorter shape buddygroup uses
 * (`buddygroup-fe/app/pages/about.vue`: Hero, StoryFounder, StoryCeo). What
 * came across is the *rhythm* — what each band is for and how they alternate —
 * and nothing else. Their colours, their type sizes, their copy, their brand
 * and their Vue idioms all stay where they are.
 *
 * | band            | reference band                     | what changed                     |
 * |-----------------|------------------------------------|----------------------------------|
 * | Hero            | `SectionHero`                      | one claim, no CTA; left, not centred |
 * | Why it exists   | `SectionDetail`                    | four paragraphs became three, beside one photo |
 * | What we hold to | `SectionBelief`                    | a written claim, not an illustration |
 * | Vetting         | `SectionQualityShowcase`           | three alternating rows, nothing pinned |
 * | Six fields      | `SectionCategories`                | six, from `home.category*`, three across |
 * | One session     | (none — this product has a flow)   | four steps, the reference has no equivalent |
 * | The people      | `SectionPeople` / buddygroup's CEO and founder stories | three teams, no invented names |
 * | Join us         | `SectionPartnerWithUs`             | two audiences, two real routes    |
 *
 * Four of the reference's bands are deliberately absent. `SectionOurHistory` is
 * a year-by-year timeline: this product has no history that is not a fiction, and
 * a made-up founding date on an about page is the one lie a reader can check.
 * `SectionOurCoreBelieve` sets three one-word values in pink circles, which says
 * less than the sentence the Belief band already says. `Awards` needs awards.
 * `SectionPeopleMakeGrow` is a second, longer telling of the People band.
 *
 * What is written here also has to agree with the rest of the app: the three
 * checks in the Vetting band are the three `components/home/vetting.tsx` states
 * and the three stages of `/advisor-onboarding`, in the same order, and the fee
 * and escrow lines match `landing.know3Body` and `landing.faq3Answer`.
 */

/**
 * `TYPE_LADDER` — the sizes, in one place, so they can be checked at a glance.
 *
 * | element             |  402 |  768 | 1280 |
 * |---------------------|------|------|------|
 * | hero h1             |   32 |   40 |   48 |
 * | band h2             |   28 |   32 |   40 |
 * | the quote           |   20 |   24 |   32 |
 * | band lead           |   16 |   18 |   20 |
 * | prose              |   16 |   16 |   18 |
 * | card h3             |   18 |   20 |   20 |
 * | card body, captions |   14 |   14 |   16 |
 *
 * Every column descends, and no step is an arbitrary value: they are the named
 * steps in `app/globals.css` (`heading`, `heading-lg`, `display`) plus Tailwind's
 * own, whose Thai leading that file already corrects.
 */
const BAND_TITLE = "w-full text-heading font-semibold text-foreground md:text-heading-lg lg:text-display";
const BAND_LEAD = "w-full text-base font-normal text-muted-foreground md:text-lg lg:text-xl";
const PROSE = "w-full text-base font-normal text-muted-foreground lg:text-lg";
const CARD_TITLE = "w-full text-lg font-semibold text-foreground md:text-xl";
const CARD_BODY = "w-full text-sm font-normal text-muted-foreground lg:text-base";

/**
 * The band's own box: the page gutter at all three widths, and the vertical air
 * that separates one claim from the next.
 *
 * 24px of gutter on the phone like every other screen, 32 at the tablet and 48
 * at the desktop, which is `PAGE` — the inset is a decision that lives in
 * `lib/layout.ts`, not a number per band. The vertical rhythm is the one thing
 * this page sets for itself: 48 / 64 / 96, against the reference's 28 / 40 / 80,
 * because these bands hold more text per band than its do.
 *
 * `overflow-clip` is load-bearing, not housekeeping. The side reveals translate
 * their content 24px horizontally, and `ScreenBody` only manages its *vertical*
 * overflow — without the clip, a band arriving from the right could hand the
 * page a horizontal scrollbar for the length of the tween.
 */
const BAND = cn(
  "flex w-full flex-col items-start gap-6 px-6 py-12 md:gap-8 md:px-8 md:py-16 lg:gap-10 lg:py-24",
  PAGE,
);

/** A prose measure. 820px is where a 16/18px line stops being a scan. */
const MEASURE = "lg:max-w-[820px]";

/** Two halves that stack on the phone and sit side by side from the tablet. */
const SPLIT = "flex w-full flex-col gap-6 md:grid md:grid-cols-2 md:items-center md:gap-10 lg:gap-16";

function Band({
  children,
  id,
  tint = false,
  className,
}: {
  readonly children: ReactNode;
  readonly id?: string;
  /** The alternating ground. Every other band takes it, so none of them shouts. */
  readonly tint?: boolean;
  readonly className?: string;
}) {
  return (
    <section
      className={cn("w-full shrink-0 overflow-clip", tint && "bg-muted")}
      id={id}
    >
      <div className={cn(BAND, className)}>{children}</div>
    </section>
  );
}

/** A band's heading and, where the band needs one, the line under it. */
function BandHead({
  title,
  lead,
  from = "up",
}: {
  readonly title: string;
  readonly lead?: string;
  readonly from?: RevealFrom;
}) {
  return (
    <Reveal className={cn("flex w-full flex-col items-start gap-3", MEASURE)} from={from}>
      <h2 className={BAND_TITLE}>{title}</h2>
      {lead ? <p className={BAND_LEAD}>{lead}</p> : null}
    </Reveal>
  );
}

/**
 * The numbered bead, borrowed from `FaqSection` — `--marker` is a gradient token
 * that reads as a raised dot, which is what makes a numeral an ordinal rather
 * than a swatch with a digit on it.
 */
function Bead({ index }: { readonly index: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marker font-latin text-sm font-semibold tabular-nums text-primary shadow-[inset_0_0_8px_var(--marker-sheen)]">
      {index}
    </span>
  );
}

/**
 * The three checks, in the order an applicant clears them.
 *
 * Same three as `components/home/vetting.tsx`, same icons, same order, and the
 * same order as `/advisor-onboarding` stages 1 to 3. Two places on the site
 * state this promise; they are not allowed to disagree about it.
 */
const CHECKS = [
  { icon: BadgeCheck, key: "vetting1", seed: "advisory-identity-verification-desk" },
  { icon: FileCheck, key: "vetting2", seed: "advisory-credential-documents" },
  { icon: ShieldCheck, key: "vetting3", seed: "advisory-review-team-meeting" },
] as const;

/** The six fields, with the labels the home screen and the search filters use. */
const FIELDS = [
  { icon: Briefcase, label: "categoryBusiness", body: "fieldBusiness", seed: "advisory-field-business" },
  { icon: Wallet, label: "categoryFinance", body: "fieldFinance", seed: "advisory-field-finance" },
  { icon: FileText, label: "categoryLegal", body: "fieldLegal", seed: "advisory-field-legal" },
  { icon: Book, label: "categoryEducation", body: "fieldEducation", seed: "advisory-field-education" },
  { icon: Brain, label: "categoryWellbeing", body: "fieldWellbeing", seed: "advisory-field-wellbeing" },
  { icon: CodeXml, label: "categoryTech", body: "fieldTech", seed: "advisory-field-technology" },
] as const;

/** One session, end to end. The escrow step is the one that matters. */
const FLOW = [
  { icon: MessageSquare, key: "flow1" },
  { icon: CalendarClock, key: "flow2" },
  { icon: Video, key: "flow3" },
  { icon: Wallet, key: "flow4" },
] as const;

/** The three teams. Roles, not people — see `peopleNote`. */
const TEAMS = [
  { key: "team1", seed: "advisory-verification-team-desk" },
  { key: "team2", seed: "advisory-support-team-office" },
  { key: "team3", seed: "advisory-product-team-screens" },
] as const;

export function AboutScreen() {
  const t = useTranslations("about");
  // The six field names live in `home`, beside the rail and the chips that also
  // print them. A seventh copy here is a seventh chance for them to disagree.
  const home = useTranslations("home");

  return (
    // `"md"` rather than `true`: this page is one column of prose and photographs,
    // and at 768px there is nothing for the 448px cap to protect — it only
    // produces a phone-width page with 160px of empty margin either side. The
    // bands take their second and third layouts at `md` and `lg` from there.
    <MobileScreen wide="md">
      <ScreenBody>
        {/* The same pair `/landing` and `/terms` wear. `login` because this page
            is public: without it the trailing slot is a bell to `/notifications`,
            which bounces a guest to the sign-in screen from their own nav bar.
            `overlay` because the band below opens on a photograph. */}
        <TopBar login overlay />

        {/* ── Hero ── `SectionHero`: a photograph under a scrim, with the claim
            over it. The reference centres its copy and sets it 64px at the
            desktop; this is flush left on the page's own column, which is where
            every other h1 in the app starts, and the scrim is a flat value
            rather than its three stacked gradients. */}
        <section className="relative flex h-[420px] w-full shrink-0 flex-col items-start justify-end overflow-clip md:h-[520px] lg:h-[620px] lg:justify-center">
          <AboutPhoto
            alt={t("heroImageAlt")}
            className="absolute inset-0 size-full"
            height={900}
            priority
            seed="advisory-consultation-bangkok"
            width={1600}
          />
          {/* 62%: the frame that comes back is not known at build time, so the
              scrim has to hold white copy over whatever arrives. */}
          <div aria-hidden className="absolute inset-0 bg-scrim/62" />
          {/* `immediate`: the hero is on screen before anyone scrolls, so a
              scroll trigger here would either fire in the same frame or never.
              `stagger` walks the claim and the line under it in, which is the
              reference's `heroTimeline` reduced to the two things it moves. */}
          <Reveal
            className={cn(
              "relative flex w-full flex-col items-start gap-4 px-6 pb-10 md:px-8 md:pb-16 lg:pb-0",
              PAGE,
              "lg:[&>*]:max-w-[760px]",
            )}
            immediate
            stagger
          >
            <h1 className="w-full text-heading-lg font-semibold text-on-media md:text-display lg:text-5xl lg:leading-tight">
              {t("heroTitleLine1")}
              <br />
              {t("heroTitleLine2")}
            </h1>
            {/* Full strength rather than 82%: dimmed white over an unknown
                photograph is where the contrast floor stops being provable. */}
            <p className="w-full text-base font-normal text-on-media md:text-lg lg:text-xl">
              {t("heroBody")}
            </p>
          </Reveal>
        </section>

        {/* ── Why it exists ── `SectionDetail`: prose in one column, a photograph
            in the other. The reference runs four paragraphs at 11px on the
            tablet; three at 16 is the same band said once. */}
        <Band id="why">
          <div className={SPLIT}>
            {/* Each half enters from the side it occupies, which is the one thing
                the reference's `slideFromLeft` / `slideFromRight` pair does that
                a plain fade cannot: it says the two halves are one row. */}
            <Reveal className="flex w-full flex-col items-start gap-4" from="left">
              <h2 className={BAND_TITLE}>{t("whyTitle")}</h2>
              <p className={PROSE}>{t("whyBody1")}</p>
              <p className={PROSE}>{t("whyBody2")}</p>
              <p className={PROSE}>{t("whyBody3")}</p>
            </Reveal>
            <Reveal className="w-full" delay={0.12} from="right">
              <AboutPhoto
                alt={t("whyImageAlt")}
                className="aspect-[4/3] w-full rounded-card border border-border"
                height={720}
                seed="advisory-question-notebook"
                width={960}
              />
            </Reveal>
          </div>
        </Band>

        {/* ── What we hold to ── `SectionBelief`: one centred claim, the only
            band on the page that raises its voice. The reference closes it with
            a hand-drawn illustration of three people; there is no illustration
            for this, and a stock photograph under a sentence like this one would
            undercut it, so the band is type alone. */}
        <Band className="items-center text-center" tint>
          <Reveal className="mx-auto flex w-full flex-col items-center gap-5 lg:max-w-[900px]">
            <h2 className={BAND_TITLE}>{t("beliefTitle")}</h2>
            <p className="w-full text-xl font-semibold text-foreground md:text-2xl lg:text-heading-lg">
              {`“${t("beliefQuoteLine1")}`}
              <br />
              {`${t("beliefQuoteLine2")}”`}
            </p>
            <p className={cn(BAND_LEAD, "lg:max-w-[820px]")}>{t("beliefBody")}</p>
          </Reveal>
        </Band>

        {/* ── Vetting ── `SectionQualityShowcase`, unpinned. The reference stacks
            four cards and pins the band for 2700px of scroll while they deal
            themselves out; on a phone that is a section you cannot scroll past.
            The information is the same — a claim, its explanation, its
            photograph, three times — as three alternating rows that each arrive
            once and then stay put. */}
        <Band id="vetting">
          <BandHead lead={t("vettingLead")} title={t("vettingTitle")} />
          <div className="flex w-full flex-col gap-10 md:gap-16 lg:gap-20">
            {CHECKS.map(({ icon: Icon, key, seed }, index) => {
              // Rows alternate, and the reveal follows the layout: the prose
              // always enters from the side it ends up on.
              const flipped = index % 2 === 1;

              return (
                <div className={SPLIT} key={key}>
                  <Reveal
                    className={cn(
                      "flex w-full flex-col items-start gap-3",
                      flipped && "md:order-2",
                    )}
                    from={flipped ? "right" : "left"}
                  >
                    <div className="flex w-full items-center gap-3">
                      <Bead index={`${index + 1}`} />
                      <h3 className={CARD_TITLE}>{t(`${key}Title`)}</h3>
                    </div>
                    <p className={PROSE}>{t(`${key}Body`)}</p>
                    <p className="flex w-full items-start gap-2 text-sm font-normal text-muted-foreground lg:text-base">
                      <Icon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-success" />
                      {t(`${key}Proof`)}
                    </p>
                  </Reveal>
                  <Reveal
                    className={cn("w-full", flipped && "md:order-1")}
                    delay={0.12}
                    from={flipped ? "left" : "right"}
                  >
                    <AboutPhoto
                      alt={t(`${key}ImageAlt`)}
                      className="aspect-[3/2] w-full rounded-card border border-border"
                      height={640}
                      seed={seed}
                      width={960}
                    />
                  </Reveal>
                </div>
              );
            })}
          </div>
          <Reveal className={cn("w-full", MEASURE)}>
            <p className={cn(surfaceClass({ tier: "well" }), "w-full p-4 text-sm font-normal text-foreground lg:p-5 lg:text-base")}>
              {t("vettingNote")}
            </p>
          </Reveal>
        </Band>

        {/* ── Six fields ── `SectionCategories`: a grid of photographs with the
            name under each. The reference runs four at 396px tall and links each
            one into a filtered product list; there are six here, three across at
            the desktop rather than six, because six on a 1344 column leaves 204px
            per card and a Thai line needs more than that. */}
        <Band id="fields" tint>
          <BandHead lead={t("fieldsLead")} title={t("fieldsTitle")} />
          {/* The wrapper is the grid, so the six cards are what stagger. */}
          <Reveal
            className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-6"
            stagger
          >
            {FIELDS.map(({ icon: Icon, label, body, seed }) => (
              <Link
                aria-label={t("fieldLinkLabel", { field: home(label) })}
                className={cn(
                  surfaceClass({ interactive: true }),
                  "group flex flex-col items-stretch overflow-clip",
                )}
                href="/search"
                key={label}
              >
                <AboutPhoto
                  alt={t("fieldImageAlt", { field: home(label) })}
                  className="aspect-[3/2] w-full"
                  height={400}
                  seed={seed}
                  width={600}
                />
                <span className="flex flex-1 flex-col items-start gap-1 p-3 lg:p-5">
                  <span className="flex w-full items-center gap-2">
                    <Icon aria-hidden className="size-4.5 shrink-0 text-primary" />
                    <span className="min-w-px flex-1 text-base font-semibold text-foreground lg:text-lg">
                      {home(label)}
                    </span>
                    {/* The one hover the cards make, and it says the card is a
                        link rather than decorating it. `motion-reduce` holds the
                        glyph still for anyone who asked not to be moved. */}
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </span>
                  <span className={CARD_BODY}>{t(body)}</span>
                </span>
              </Link>
            ))}
          </Reveal>
        </Band>

        {/* ── One session ── the reference has no band for this; it sells
            manufacturing, not a flow with steps. This is the band the product
            needs in its place, and it is the four steps `/landing` lists, told
            from the reader's side rather than as instructions. */}
        <Band id="how-it-works">
          <BandHead lead={t("flowLead")} title={t("flowTitle")} />
          <Reveal className="grid w-full gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-4" stagger>
            {FLOW.map(({ icon: Icon, key }, index) => (
              <Surface className="flex flex-col items-start gap-3 p-4 lg:p-5" key={key}>
                <div className="flex w-full items-center gap-3">
                  <Bead index={`${index + 1}`} />
                  <Icon aria-hidden className="size-4.5 shrink-0 text-primary" />
                </div>
                <p className={CARD_TITLE}>{t(`${key}Title`)}</p>
                <p className={CARD_BODY}>{t(`${key}Body`)}</p>
              </Surface>
            ))}
          </Reveal>
        </Band>

        {/* ── The people ── `SectionPeople`, and buddygroup's founder and CEO
            stories. Both put a named person and a signed quote on the page. There
            is no one to name here and inventing a founder with a quote would be
            the page's first lie, so this band is the three teams that actually do
            the work, and `peopleNote` says plainly why no names appear. */}
        <Band id="team" tint>
          <BandHead lead={t("peopleLead")} title={t("peopleTitle")} />
          <Reveal className="grid w-full gap-4 md:grid-cols-3 md:gap-6" stagger>
            {TEAMS.map(({ key, seed }) => (
              <Surface className="flex flex-col items-stretch overflow-clip" key={key}>
                <AboutPhoto
                  alt={t(`${key}ImageAlt`)}
                  className="aspect-[4/3] w-full"
                  height={480}
                  seed={seed}
                  width={640}
                />
                <div className="flex flex-1 flex-col items-start gap-2 p-4 lg:p-5">
                  <p className={CARD_TITLE}>{t(`${key}Title`)}</p>
                  <p className={CARD_BODY}>{t(`${key}Body`)}</p>
                </div>
              </Surface>
            ))}
          </Reveal>
          <Reveal className={cn("w-full", MEASURE)}>
            <p className="w-full text-sm font-normal text-muted-foreground lg:text-base">
              {t("peopleNote")}
            </p>
          </Reveal>
        </Band>

        {/* ── Join us ── `SectionPartnerWithUs`: a tinted band, two cards that
            each address one side of the marketplace, and the page's only pair of
            buttons. The reference paints a 635px block of lilac behind the cards;
            this uses the app's own `--hero-wash`, the decorative layer the home
            screen opens on, so the page closes on the colour it opens with. */}
        <section className="relative w-full shrink-0 overflow-clip" id="join">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-hero-wash"
          />
          <div className={BAND}>
            <BandHead lead={t("joinLead")} title={t("joinTitle")} />
            <Reveal className="grid w-full gap-4 md:grid-cols-2 md:gap-6" stagger>
              <JoinCard
                alt={t("joinSeekerImageAlt")}
                body={t("joinSeekerBody")}
                cta={t("joinSeekerCta")}
                href="/matching"
                points={[t("joinSeekerPoint1"), t("joinSeekerPoint2"), t("joinSeekerPoint3")]}
                seed="advisory-client-video-call"
                title={t("joinSeekerTitle")}
              />
              <JoinCard
                alt={t("joinAdvisorImageAlt")}
                body={t("joinAdvisorBody")}
                cta={t("joinAdvisorCta")}
                href="/advisor/apply"
                points={[t("joinAdvisorPoint1"), t("joinAdvisorPoint2"), t("joinAdvisorPoint3")]}
                seed="advisory-advisor-home-office"
                secondary
                title={t("joinAdvisorTitle")}
              />
            </Reveal>
          </div>
        </section>

        <SiteFooter />
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * One side of the marketplace: a photograph, what it offers, three things it
 * promises, and the route that starts it.
 *
 * The two cards are deliberately the same object with one difference — which
 * button variant it ends on. The advisee's path is the page's primary action;
 * the advisor's is the alternative, and giving both an accent fill would make the
 * page ask for two things at once.
 */
function JoinCard({
  title,
  body,
  points,
  cta,
  href,
  seed,
  alt,
  secondary = false,
}: {
  readonly title: string;
  readonly body: string;
  readonly points: readonly string[];
  readonly cta: string;
  readonly href: string;
  readonly seed: string;
  readonly alt: string;
  readonly secondary?: boolean;
}) {
  const ActionButton = secondary ? NeutralButton : PrimaryButton;

  return (
    <Surface className="flex flex-col items-stretch overflow-clip">
      <AboutPhoto alt={alt} className="aspect-video w-full" height={450} seed={seed} width={800} />
      <div className="flex flex-1 flex-col items-start gap-3 p-4 lg:gap-4 lg:p-6">
        <p className={CARD_TITLE}>{title}</p>
        <p className={CARD_BODY}>{body}</p>
        <ul className="flex w-full flex-col items-start gap-2">
          {points.map((point) => (
            <li className="flex w-full items-start gap-2" key={point}>
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              <span className={CARD_BODY}>{point}</span>
            </li>
          ))}
        </ul>
        {/* `block` keeps the button full width inside the card at every size: it
            is the card's single action, so sizing it to its label from `lg`
            would leave it floating against a 600px-wide card. */}
        <ActionButton block className="mt-auto" href={href}>
          {cta}
        </ActionButton>
      </div>
    </Surface>
  );
}
