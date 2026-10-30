import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Lock,
  Plus,
  RotateCw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Art, type ArtName, Lines, Scene, Stage, beat, type MotionKind } from "@/components/about/story-parts";
import { logo } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * The `/about` story, put together from separate cut-outs: real-looking
 * people and things, each its own picture, each moved by the scroll on its
 * own (`story-motion.ts`, `SCENE_MOTION`), with the site's own UI joining in
 * where the story touches the product.
 *
 * Ask has a lot of questions; Answer knows what Ask wants to know. They pass
 * each other every day without knowing it; Ask asks everyone else and gets
 * ten answers; finds Advisory, where Answer is already waiting; books thirty
 * minutes at eight; talks on video in pajama pants; Answer turns out to be
 * checked; the money waits with us until Answer has answered; and in the end
 * both get what they came for. The ending asks which of the two the reader is
 * (`StoryClose`).
 *
 * Every moving piece is a `Part`, found by its `name`. On the phone the
 * pieces simply arrive as they scroll into view, as their `kind`. Positions
 * after `lg:` are pixels on the 1710×985 frame (`FRAME`); below `lg` they are
 * offsets in the scene's `Stage` box. People stand on the line 100 above the
 * frame's foot.
 */

/** One moving piece of a scene, placed by `spot`. */
function Part({
  name,
  kind = "pop",
  spot,
  children,
}: {
  readonly name: string;
  /** How it arrives on the phone. */
  readonly kind?: MotionKind;
  readonly spot: string;
  readonly children: ReactNode;
}) {
  return (
    <div {...beat(kind)} className={cn("absolute", spot)} data-part={name}>
      {children}
    </div>
  );
}

/** A walker's body, which the timeline bobs while the part travels. */
function Bob({ children }: { readonly children: ReactNode }) {
  return <div data-bob>{children}</div>;
}

/** A cut-out, tilted at rest if `tilt` is given (the timeline keeps the angle). */
function Cut({ name, size, tilt }: { readonly name: ArtName; readonly size: string; readonly tilt?: string }) {
  return (
    <div className={tilt}>
      <Art className={size} name={name} />
    </div>
  );
}

/** The lines beside the picture rather than over it: left or right of the frame, left-aligned. */
const LEFT_COPY = "lg:inset-x-auto lg:top-[300px] lg:left-[140px] lg:w-[640px] lg:items-start lg:text-left";
const RIGHT_COPY = "lg:inset-x-auto lg:top-[320px] lg:left-[1020px] lg:w-[600px] lg:items-start lg:text-left";

/** Standing on the line, centred. */
const CENTRE = "inset-x-0 bottom-0 flex justify-center lg:bottom-[100px]";

/* ── The site's UI, as it joins the story ────────────────────────────────── */

function ChatBubble({ children }: { readonly children: ReactNode }) {
  return (
    <span className="block rounded-3xl rounded-bl-md bg-card px-4 py-2 font-story text-base font-medium whitespace-nowrap text-foreground shadow-hero-card ring-1 ring-border lg:px-7 lg:py-4 lg:text-3xl">
      {children}
    </span>
  );
}

function AnswerCard() {
  const t = useTranslations("about");
  return (
    <div className="flex w-72 items-center gap-3 rounded-2xl bg-card p-3 shadow-hero-card ring-2 ring-primary lg:w-[520px] lg:gap-5 lg:rounded-3xl lg:p-5">
      <span className="size-12 shrink-0 overflow-hidden rounded-full bg-muted lg:size-20">
        <Art className="h-[150%] max-w-none -translate-x-[18%]" name="answer_bust" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        <span className="font-story text-lg font-semibold lg:text-3xl">{t("s4Name")}</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground lg:text-xl">
          {t("s4Role")}
          <Star aria-hidden className="size-3.5 fill-current text-hero-warm lg:size-5" />
          5.0
        </span>
      </span>
      <span
        className="rounded-full bg-hero-action px-4 py-2 font-story text-sm font-medium text-hero-action-foreground lg:px-6 lg:py-3 lg:text-xl"
        data-part="book"
      >
        {t("s4Book")}
      </span>
    </div>
  );
}

const SLOTS = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30"] as const;

function Slots() {
  const t = useTranslations("about");
  return (
    <div className="w-72 rounded-3xl bg-card p-4 shadow-hero-card ring-1 ring-border lg:w-[560px] lg:p-7">
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {SLOTS.map((slot) => (
          <span
            className="flex h-10 items-center justify-center rounded-full border border-border bg-card font-latin text-sm font-medium lg:h-16 lg:text-2xl"
            data-part={slot === "20:00" ? "pick" : "slot"}
            key={slot}
          >
            {slot}
          </span>
        ))}
      </div>
      <span className="mt-3 inline-flex h-9 items-center rounded-full bg-muted px-4 font-story text-sm font-medium lg:mt-5 lg:h-12 lg:px-6 lg:text-xl">
        {t("s5Length")}
      </span>
    </div>
  );
}

/* ── Opening: this is Ask ────────────────────────────────────────────────── */

/**
 * Advisory's mark alone, cropped out of the wordmark as the app frame's rail
 * crops it, in its own blue: the search page's logo and its tab's icon. The
 * mark is the lockup's first 0.893 of its height across; `className` sets the
 * box to that shape.
 */
function Mark({ className }: { readonly className: string }) {
  return (
    <span className={cn("block shrink-0 overflow-hidden", className)}>
      <Image alt="" className="h-full w-auto max-w-none" src={logo} />
    </span>
  );
}

const SEARCH_TABS = ["openTabAll", "openTabImages", "openTabVideos", "openTabNews"] as const;
const SEARCH_RESULTS = [1, 2, 3] as const;

/**
 * What Ask is searching for, on the laptop's blank screen: a browser window
 * on a web search's results page, laid out at a browser's own sizes on a
 * 400-wide page and scaled down onto the screen (123 wide on the frame with
 * the laptop 110 high, so 0.308). The results run off its foot.
 */
function SearchScreen() {
  const t = useTranslations("about");
  const query = t("openSearch");
  const encoded = encodeURIComponent(query).replaceAll("%20", "+");
  const address = `https://www.google.com/search?q=${encoded}&oq=${encoded}&sourceid=chrome&ie=UTF-8`;

  return (
    <div aria-hidden className="size-full overflow-hidden bg-card text-left">
      <div className="flex h-[254px] w-[400px] origin-top-left scale-[0.308] flex-col">
        {/* The title bar: the window's close, minimise and zoom buttons, the
            open tab and a new-tab button. */}
        <span className="flex h-8 shrink-0 items-end gap-2 bg-muted pr-2 pl-3">
          <span className="flex gap-1.5 self-center">
            <span className="size-2.5 rounded-full bg-destructive" />
            <span className="size-2.5 rounded-full bg-warning" />
            <span className="size-2.5 rounded-full bg-success" />
          </span>
          <span className="ml-2 flex h-6.5 w-44 items-center gap-1.5 rounded-t-lg bg-card px-2.5 text-xs text-foreground">
            <Mark className="h-3.5 w-[12.5px]" />
            <span className="min-w-0 flex-1 truncate">{t("openTabTitle", { query })}</span>
            <X className="size-3 shrink-0 text-muted-foreground" />
          </span>
          <Plus className="mb-1.5 size-3.5 text-muted-foreground" />
        </span>
        {/* The toolbar: back, forward, reload, the address and the profile. */}
        <span className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-2">
          <ArrowLeft className="size-3.5 shrink-0 text-muted-foreground" />
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50" />
          <RotateCw className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted px-3 text-xs">
            <SlidersHorizontal className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate text-foreground">{address}</span>
          </span>
          <span className="size-5 shrink-0 rounded-full bg-primary/70" />
        </span>
        {/* The page, as a narrow window lays it out: everything from the
            left margin. */}
        <span className="flex flex-col gap-2 px-4 pt-3">
          <span className="flex items-center gap-3">
            <Mark className="h-8 w-[28.5px]" />
            <span className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-border px-3 shadow-sm">
              <span className="min-w-0 flex-1 truncate text-base text-foreground">{query}</span>
              <X className="size-4 shrink-0 text-muted-foreground" />
              <span className="h-5 w-px shrink-0 bg-border" />
              <Search className="size-4 shrink-0 text-primary" />
            </span>
          </span>
          <span className="-mx-4 flex gap-5 border-b border-border px-4 text-sm text-muted-foreground">
            {SEARCH_TABS.map((tab, index) => (
              <span className={cn("pb-2", index === 0 && "border-b-2 border-foreground text-foreground")} key={tab}>
                {t(tab)}
              </span>
            ))}
          </span>
          <span className="text-xs text-muted-foreground">{t("openResults")}</span>
          {SEARCH_RESULTS.map((result) => (
            <span className="flex flex-col gap-1 pt-2" key={result}>
              <span className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-2xs text-muted-foreground">
                  {t(`openResult${result}Site`).charAt(0)}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-sm text-foreground">{t(`openResult${result}Site`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`openResult${result}Url`)}</span>
                </span>
              </span>
              <span className="text-xl leading-snug text-primary">{t(`openResult${result}Title`)}</span>
              <span className="line-clamp-2 text-sm text-muted-foreground">{t(`openResult${result}Text`)}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

/**
 * The questions: sticky notes bursting out of Ask's head, the first there
 * from the start, the rest piling up as the page scrolls. Four fan out to
 * the right over the desk and two sit in the gap between the window and
 * Ask; the nearer the head, the bigger. All stay under the title (218),
 * above the lamp's shade (470) and the laptop (487), and off the window
 * (its right edge 571).
 */
const QUESTIONS = [
  { spot: "top-0 right-4 lg:top-[300px] lg:right-auto lg:left-[905px]", tilt: "rotate-6", size: "h-16 lg:h-[110px]" },
  { spot: "hidden lg:block lg:top-[250px] lg:left-[588px]", tilt: "-rotate-12", size: "lg:h-[90px]" },
  { spot: "hidden lg:block lg:top-[255px] lg:left-[1055px]", tilt: "-rotate-6", size: "lg:h-[95px]" },
  { spot: "hidden lg:block lg:top-[375px] lg:left-[1110px]", tilt: "rotate-12", size: "lg:h-[80px]" },
  { spot: "hidden lg:block lg:top-[290px] lg:left-[1230px]", tilt: "rotate-3", size: "lg:h-[85px]" },
  { spot: "hidden lg:block lg:top-[400px] lg:left-[600px]", tilt: "-rotate-3", size: "lg:h-[75px]" },
] as const;

export function OpeningScene() {
  const t = useTranslations("about");

  return (
    <Scene className="pt-28" id="open" labelledBy="story-title">
      <div className="relative flex w-full flex-col items-center lg:absolute lg:inset-x-0 lg:top-[120px]" data-part="copy">
        <Lines accent={0} as="h1" className="lg:static" id="story-title" intro lines={[t("openL1"), t("openL2")]} />
      </div>

      {/* Ask's room, back to front: the window on the wall, the desk with
          the lamp, the laptop and a mug on it, Ask beside it, the chair past
          its far end, and the plant framing the left edge. */}
      <Stage className="h-96">
        <Part name="room-left" spot="hidden lg:block lg:top-[252px] lg:left-[321px]">
          <Art className="lg:h-[455px]" name="window_room" />
        </Part>
        {/* Everything in the room is photographed from Ask's eye height, so
            the desk shows only a sliver of its top: the upper 8% of the
            picture. At 300 high on the frame (81 cm beside Ask's 590, about
            160 cm) that runs from 400 (back) to 376 (front) above the stage's
            bottom, and what stands on it puts its foot inside that band,
            further back standing higher. */}
        {/* `room-right`: the desk and everything on it, and the chair, which
            leave together so nothing slides off the desk on the way out. */}
        <Part name="room-right" spot="right-0 bottom-0 lg:right-auto lg:bottom-[100px] lg:left-[920px]">
          <Art className="h-28 lg:h-[300px]" name="desk" />
        </Part>
        {/* On the desk, left to right: the lamp at the back corner, the
            laptop in the middle (the desk's centre is 1177), the mug at the
            front, a hand's width off the laptop. */}
        <Part name="room-right" spot="hidden lg:block lg:bottom-[390px] lg:left-[989px]">
          <Art className="lg:h-[125px]" name="desk_lamp" />
        </Part>
        <Part name="room-right" spot="right-[70px] bottom-[98px] lg:right-auto lg:bottom-[388px] lg:left-[1096px]">
          <div className="relative">
            <Art className="block h-10 lg:h-[110px]" name="laptop" />
            {/* The screen leans back: its white runs from 11.5–87.6% across at
                the foot (71.6% down) to 12.5–86.4% at the top (6.6% down). So
                the page stands on the foot and tilts away from it, 20° under a
                919 perspective narrowing its top by those 2.8%. */}
            <div className="absolute bottom-[28.4%] left-[11.5%] hidden h-[71.2%] w-[76.1%] origin-bottom [transform:perspective(919px)_rotateX(20deg)] lg:block">
              <SearchScreen />
            </div>
          </div>
        </Part>
        <Part name="room-right" spot="hidden lg:block lg:bottom-[388px] lg:left-[1300px]">
          <Art className="lg:h-9" name="mug" />
        </Part>
        <Part name="ask" spot="bottom-0 left-4 lg:bottom-[100px] lg:left-[715px]">
          <div data-intro>
            <Art className="h-80 lg:h-[590px]" name="asker_chin" />
          </div>
        </Part>
        <Part name="room-right" spot="hidden lg:block lg:bottom-[100px] lg:left-[1440px]">
          <Art className="lg:h-[365px]" name="office_chair" />
        </Part>
        <Part name="room-left" spot="hidden lg:block lg:bottom-[95px] lg:left-[156px]">
          <Art className="lg:h-[310px]" name="plant_big" />
        </Part>
        {QUESTIONS.map(({ spot, tilt, size }) => (
          <Part key={spot} name="question" spot={spot}>
            <Cut name="sticky_note" size={size} tilt={tilt} />
          </Part>
        ))}
      </Stage>
    </Scene>
  );
}

/* ── 1: and this is Answer ───────────────────────────────────────────────── */

function AnswerScene() {
  const t = useTranslations("about");
  return (
    <Scene id="s1" labelledBy="story-s1" staged>
      <Lines accent={0} id="story-s1" lines={[t("s1L1"), t("s1L2")]} />
      {/* Answer's office, next door to Ask's room: she is a financial and tax
          adviser, so it is a working adviser's room, light and orderly, in as
          few pieces as Ask's: the window on the city, her certificate on the
          wall, her desk with Answer standing behind it, the shelf of client
          binders, and the plant framing the right edge. Sized to Answer
          (163 cm, her head's top at 703): desk 78 cm, shelf 125. All stand on
          the line 100 up, the plant a step nearer at 90. */}
      <Stage className="h-96">
        <Part name="piece" spot="hidden lg:block lg:top-[240px] lg:left-[130px]">
          <Art className="lg:h-[300px]" name="office_window" />
        </Part>
        <Part name="piece" spot="hidden lg:block lg:top-[270px] lg:left-[1060px]">
          <Art className="lg:h-[120px]" name="certificate" />
        </Part>
        <Part name="piece" spot="hidden lg:block lg:bottom-[100px] lg:left-[1220px]">
          <Art className="lg:h-[460px]" name="binder_shelf" />
        </Part>
        {/* Answer is pictured from the hips up, standing behind the desk: the
            picture's foot (363) is behind its front panel, which runs solid
            from its top (390) to the floor. */}
        <Part kind="right" name="answer" spot="inset-x-0 bottom-[80px] flex justify-center lg:inset-x-auto lg:bottom-[363px] lg:left-[694px]">
          <Bob>
            <Art className="h-64 lg:h-[340px]" name="answer_casual" />
          </Bob>
        </Part>
        <Part name="piece" spot="inset-x-0 bottom-0 flex justify-center lg:inset-x-auto lg:bottom-[100px] lg:left-[560px]">
          <Art className="h-28 lg:h-[290px]" name="panel_desk" />
        </Part>
        <Part name="piece" spot="hidden lg:block lg:bottom-[90px] lg:left-[1500px]">
          <Art className="lg:h-[360px]" name="snake_plant" />
        </Part>
      </Stage>
    </Scene>
  );
}

/* ── 2: they pass each other every day ───────────────────────────────────── */

function StreetScene() {
  const t = useTranslations("about");
  return (
    <Scene id="s2" labelledBy="story-s2" staged>
      <Lines accent={1} id="story-s2" lines={[t("s2L1"), t("s2L2")]} />
      <Stage className="h-96">
        <Part kind="rise" name="building" spot="bottom-0 left-0 lg:bottom-[100px] lg:left-[200px]">
          <Art className="h-56 opacity-90 lg:h-[600px]" name="building_office" />
        </Part>
        <Part kind="rise" name="building" spot="right-0 bottom-0 lg:right-auto lg:bottom-[100px] lg:left-[1210px]">
          <Art className="h-48 opacity-90 lg:h-[520px]" name="building_condo" />
        </Part>
        <Part kind="rise" name="building" spot="inset-x-0 bottom-0 flex justify-center lg:inset-x-auto lg:bottom-[100px] lg:left-[600px]">
          <Art className="h-28 opacity-90 lg:h-[320px]" name="building_shophouse" />
        </Part>
        <Part kind="left" name="ask" spot="bottom-0 left-[16%] lg:bottom-[90px] lg:left-[700px]">
          <Bob>
            <Art className="h-48 lg:h-[520px]" name="ask_walk" />
          </Bob>
        </Part>
        <Part kind="right" name="answer" spot="right-[16%] bottom-0 lg:right-auto lg:bottom-[90px] lg:left-[860px]">
          <Bob>
            <Art className="h-48 lg:h-[540px]" name="answer_walk" />
          </Bob>
        </Part>
        <Part kind="left" name="tree-left" spot="hidden lg:block lg:bottom-[40px] lg:left-[-40px]">
          <Art className="lg:h-[560px]" name="tree_tall" />
        </Part>
        <Part kind="right" name="tree-right" spot="hidden lg:block lg:bottom-[50px] lg:left-[1470px]">
          <Art className="lg:h-[420px]" name="tree_round" />
        </Part>
      </Stage>
    </Scene>
  );
}

/* ── 3: everyone else's answers ──────────────────────────────────────────── */

const REPLIES = [
  { say: "s3Say1", spot: "top-0 left-0 lg:top-[300px] lg:left-[230px]", tilt: "-rotate-6" },
  { say: "s3Say2", spot: "top-2 right-0 lg:top-[290px] lg:right-auto lg:left-[1290px]", tilt: "rotate-6" },
  { say: "s3Say3", spot: "hidden lg:block lg:top-[470px] lg:left-[540px]", tilt: "rotate-3" },
  { say: "s3Say4", spot: "hidden lg:block lg:top-[460px] lg:left-[1010px]", tilt: "-rotate-3" },
  { say: "s3Say5", spot: "top-16 inset-x-0 flex justify-center lg:inset-x-auto lg:top-[250px] lg:left-[700px]", tilt: "rotate-3" },
] as const;

function EveryoneScene() {
  const t = useTranslations("about");
  return (
    <Scene id="s3" labelledBy="story-s3" staged>
      <Lines accent={1} id="story-s3" lines={[t("s3L1"), t("s3L2")]} />
      <Stage className="h-96">
        <Part kind="left" name="uncle" spot="bottom-0 -left-4 lg:bottom-[100px] lg:left-[170px]">
          <Art className="h-56 lg:h-[600px]" name="uncle" />
        </Part>
        <Part kind="right" name="auntie" spot="-right-4 bottom-0 lg:right-auto lg:bottom-[100px] lg:left-[1230px]">
          <Art className="h-56 lg:h-[580px]" name="auntie" />
        </Part>
        <Part name="friend" spot="hidden lg:block lg:bottom-[100px] lg:left-[1010px]">
          <Art className="lg:h-[560px]" name="friend" />
        </Part>
        <Part kind="rise" name="ask" spot={CENTRE}>
          <Art className="h-60 lg:h-[600px]" name="asker_think" />
        </Part>
        {REPLIES.map(({ say, spot, tilt }, i) => (
          <Part key={i} name="reply" spot={spot}>
            <div className={tilt}>
              <ChatBubble>{t(say)}</ChatBubble>
            </div>
          </Part>
        ))}
      </Stage>
    </Scene>
  );
}

/* ── 4: Answer, already waiting ──────────────────────────────────────────── */

function AdvisoryScene() {
  const t = useTranslations("about");
  return (
    <Scene id="s4" labelledBy="story-s4" staged>
      <Lines accent={1} className={RIGHT_COPY} id="story-s4" lines={[t("s4L1"), t("s4L2")]} />
      <Stage className="h-96">
        {/* The sofa behind, Ask stood in front of it, eyes on the phone. */}
        <Part kind="rise" name="sofa" spot="bottom-0 left-0 lg:bottom-[100px] lg:left-[130px]">
          <Art className="h-28 lg:h-[320px]" name="sofa" />
        </Part>
        <Part kind="rise" name="ask" spot="right-6 bottom-0 lg:right-auto lg:bottom-[100px] lg:left-[560px]">
          <Art className="h-64 lg:h-[660px]" name="ask_phone" />
        </Part>
        <Part kind="rise" name="card" spot="inset-x-0 top-0 flex justify-center lg:inset-x-auto lg:top-[560px] lg:left-[1020px]">
          <AnswerCard />
        </Part>
      </Stage>
    </Scene>
  );
}

/* ── 5: thirty minutes at eight ──────────────────────────────────────────── */

function BookingScene() {
  const t = useTranslations("about");
  return (
    <Scene id="s5" labelledBy="story-s5" staged>
      <Lines accent={1} className={LEFT_COPY} id="story-s5" lines={[t("s5L1"), t("s5L2")]} />
      <Stage className="h-96">
        <Part kind="rise" name="slots" spot="inset-x-0 top-0 flex justify-center lg:inset-x-auto lg:top-[300px] lg:left-[900px]">
          <Slots />
        </Part>
        <Part name="clock" spot="right-2 bottom-0 lg:right-auto lg:bottom-[110px] lg:left-[1370px]">
          <Art className="h-28 lg:h-[240px]" name="clock" />
        </Part>
        <Part kind="rise" name="ask" spot="bottom-0 left-2 lg:bottom-[100px] lg:left-[230px]">
          <Art className="h-48 lg:h-[460px]" name="ask_phone" />
        </Part>
      </Stage>
    </Scene>
  );
}

/* ── 6: on video, in pajama pants ────────────────────────────────────────── */

/** The call as the site's video room shows it: Answer in the window, talking. */
function CallWindow() {
  return (
    <div className="w-48 overflow-hidden rounded-2xl bg-hero-action shadow-hero-card lg:w-[420px] lg:rounded-3xl">
      <div className="flex gap-1.5 px-3 py-2 lg:gap-2 lg:px-5 lg:py-3">
        <span className="size-2 rounded-full bg-on-media/40 lg:size-3" />
        <span className="size-2 rounded-full bg-on-media/40 lg:size-3" />
        <span className="size-2 rounded-full bg-on-media/40 lg:size-3" />
      </div>
      <div className="flex aspect-4/3 items-end justify-center overflow-hidden bg-muted">
        <Art className="h-[96%]" name="answer_bust" />
      </div>
    </div>
  );
}

function CallScene() {
  const t = useTranslations("about");
  return (
    <Scene id="s6" labelledBy="story-s6" staged>
      <Lines accent={1} className={RIGHT_COPY} id="story-s6" lines={[t("s6L1"), t("s6L2")]} />
      {/* The set the camera opens close on, then pulls back from: everything
          but the words, so they stay their size. */}
      <Stage className="h-96 lg:absolute lg:inset-0 lg:block lg:h-full lg:max-w-none" data-part="set">
        <Part kind="left" name="ask" spot="bottom-0 left-0 lg:bottom-[100px] lg:left-[260px]">
          <Art className="h-72 lg:h-[700px]" name="ask_call" />
        </Part>
        <Part kind="pop" name="call" spot="top-0 right-0 lg:top-[210px] lg:left-[640px]">
          <CallWindow />
        </Part>
      </Stage>
    </Scene>
  );
}

/* ── 7: the real Answer ──────────────────────────────────────────────────── */

function CheckedScene() {
  const t = useTranslations("about");
  return (
    <Scene id="s7" labelledBy="story-s7" staged>
      <Lines accent={0} className={LEFT_COPY} id="story-s7" lines={[t("s7L1"), t("s7L2")]} />
      <Stage className="h-96">
        <Part kind="right" name="answer" spot="right-0 bottom-0 lg:right-auto lg:bottom-[100px] lg:left-[1260px]">
          <Art className="h-64 lg:h-[680px]" name="expert_wave" />
        </Part>
        <Part kind="rise" name="card" spot="inset-x-0 top-4 flex justify-center lg:inset-x-auto lg:top-[360px] lg:left-[780px]">
          <Cut name="id_card" size="h-28 lg:h-[300px]" tilt="-rotate-3" />
        </Part>
        <Part name="magnifier" spot="top-0 left-4 lg:top-[290px] lg:left-[760px]">
          <Art className="h-28 lg:h-[330px]" name="magnifier" />
        </Part>
        <Part kind="stamp" name="badge" spot="inset-x-0 top-36 flex justify-center lg:inset-x-auto lg:top-[690px] lg:left-[800px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 font-story text-sm font-semibold text-confirm shadow-hero-card ring-1 ring-border lg:gap-3 lg:px-7 lg:py-4 lg:text-2xl">
            <BadgeCheck aria-hidden className="size-5 lg:size-8" />
            {t("s7Badge")}
          </span>
        </Part>
      </Stage>
    </Scene>
  );
}

/* ── 8: the money waits with us ──────────────────────────────────────────── */

/** Where the coins sit: on the jar's mouth, which the timeline flies them to and from. */
const COIN_SPOT = "hidden lg:block lg:top-[480px] lg:left-[825px]";

function EscrowScene() {
  const t = useTranslations("about");
  return (
    <Scene id="s8" labelledBy="story-s8" staged>
      <Lines accent={0} id="story-s8" lines={[t("s8L1"), t("s8L2")]} />
      <Stage className="h-96">
        <Part kind="left" name="ask" spot="bottom-0 left-0 lg:bottom-[100px] lg:left-[190px]">
          <Art className="h-52 lg:h-[600px]" name="ask_relieved" />
        </Part>
        <Part kind="right" name="answer" spot="right-0 bottom-0 lg:right-auto lg:bottom-[100px] lg:left-[1290px]">
          <Art className="h-52 lg:h-[620px]" name="expert_wave" />
        </Part>
        <Part kind="rise" name="jar" spot={CENTRE}>
          <Art className="h-44 lg:h-[400px]" name="jar" />
        </Part>
        {[0, 1, 2, 3, 4].map((i) => (
          <Part key={i} kind="drop" name="coin" spot={COIN_SPOT}>
            <Art className="lg:h-16" name="coin" />
          </Part>
        ))}
        <Part kind="drop" name="padlock" spot="inset-x-0 bottom-40 flex justify-center lg:inset-x-auto lg:bottom-auto lg:top-[430px] lg:left-[812px]">
          <Art className="h-12 lg:h-[100px]" name="padlock" />
        </Part>
        <Part kind="fade" name="talking" spot="inset-x-0 top-0 flex justify-center lg:inset-x-auto lg:top-[300px] lg:left-[640px] lg:w-[430px]">
          <span className="flex w-full items-center gap-3 rounded-full bg-card px-4 py-2 font-story text-sm font-medium shadow-hero-card ring-1 ring-border lg:gap-4 lg:px-6 lg:py-3 lg:text-xl">
            <Lock aria-hidden className="size-4 shrink-0 text-primary lg:size-6" />
            {t("s8Talking")}
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted lg:h-2">
              <span className="block h-full w-full origin-left rounded-full bg-primary" data-part="time-left" />
            </span>
          </span>
        </Part>
      </Stage>
    </Scene>
  );
}

/* ── 9: both get what they came for ──────────────────────────────────────── */

/** What goes flying when their hands meet: a burst toward the corners. */
export const BURST: readonly { readonly name: ArtName; readonly size: string; readonly to: readonly [number, number] }[] = [
  { name: "star", size: "lg:h-[120px]", to: [-620, -330] },
  { name: "question_mark", size: "lg:h-[130px]", to: [600, -320] },
  { name: "coin", size: "lg:h-[90px]", to: [-660, 150] },
  { name: "star", size: "lg:h-[90px]", to: [650, 170] },
  { name: "book", size: "lg:h-[110px]", to: [-380, -420] },
  { name: "coin", size: "lg:h-[70px]", to: [400, -440] },
];

function HighFiveScene() {
  const t = useTranslations("about");
  return (
    <Scene id="s9" labelledBy="story-s9" staged>
      <Lines accent={1} id="story-s9" lines={[t("s9L1"), t("s9L2")]} />
      <Stage className="h-96">
        {BURST.map(({ name, size }, i) => (
          <Part key={i} name="burst" spot="hidden lg:block lg:top-[420px] lg:left-[800px]">
            <Art className={size} name={name} />
          </Part>
        ))}
        <Part kind="left" name="ask" spot="bottom-0 left-[6%] lg:bottom-[100px] lg:left-[560px]">
          <Bob>
            <Art className="h-64 lg:h-[620px]" name="ask_highfive" />
          </Bob>
        </Part>
        <Part kind="right" name="answer" spot="right-[6%] bottom-0 lg:right-auto lg:bottom-[100px] lg:left-[880px]">
          <Bob>
            <Art className="h-64 lg:h-[620px]" name="answer_highfive" />
          </Bob>
        </Part>
      </Stage>
    </Scene>
  );
}

/** Every scene after the opening, in the order they are told. */
export function StoryScenes() {
  return (
    <>
      <AnswerScene />
      <StreetScene />
      <EveryoneScene />
      <AdvisoryScene />
      <BookingScene />
      <CallScene />
      <CheckedScene />
      <EscrowScene />
      <HighFiveScene />
    </>
  );
}
