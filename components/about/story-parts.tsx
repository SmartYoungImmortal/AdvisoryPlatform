import Image from "next/image";
import type { ReactNode } from "react";

import { ThaiText } from "@/components/mobile/thai-text";
import { cn } from "@/lib/utils";

/**
 * The pieces every scene of the `/about` story is built from.
 *
 * Each scene is laid out twice in one file, the way the rest of the app does
 * it: the phone's flowing column below `lg`, and from `lg` a 1710×985
 * composition (`FRAME`) scaled whole to the screen, every piece placed on it in
 * the frame's own pixels. On the desktop the scenes are stacked on one held
 * stage and played by the scroll; see `components/about/story.tsx`.
 *
 * The pictures carry the story; the words are a line or two a scene, set big.
 */

/**
 * What a moving piece does when it arrives. One vocabulary for the whole story:
 *
 * - `line`  a line of copy dropping into place from just above it
 * - `rise`  a character or object floating up from below
 * - `drop`  an object falling in from above and bouncing where it lands
 * - `pop`   an object growing out of nothing, overshooting a little
 * - `stamp` slammed down from above the page, big to its size, no bounce
 * - `left` / `right` sliding in from that side of the screen
 * - `bar`   a highlight sweeping in behind a word, left to right
 * - `ink`   the word on that highlight appearing as it lands
 * - `fade`  a plain fade
 */
export type MotionKind = "line" | "rise" | "drop" | "pop" | "stamp" | "left" | "right" | "bar" | "ink" | "fade";

/**
 * The attributes a moving piece carries: its kind and, for the desktop's
 * scrubbed timeline, when it arrives, in timeline units after its scene opens.
 * A piece with no `t` moves on the phone only. `d` overrides the duration, `r`
 * the extra turn it arrives with, `x` the distance a sliding piece travels, in
 * frame pixels.
 */
export function beat(
  kind: MotionKind,
  t?: number,
  extra: { readonly d?: number; readonly r?: number; readonly x?: number } = {},
) {
  return {
    "data-m": kind,
    "data-t": t,
    "data-d": extra.d,
    "data-r": extra.r,
    "data-x": extra.x,
  };
}

/**
 * Hidden on the desktop stage until its tween shows it. Every scene is in the
 * page from the first paint, stacked on one screen, so without this the server
 * render would draw them all at once for the moment before the script runs.
 * The tween writes `opacity` inline, which wins over the class; under reduced
 * motion, and below `lg`, the class does nothing at all.
 *
 * Only for pieces that have a desktop `t`: a piece hidden here that the
 * timeline never shows would stay hidden.
 */
export const STAGED = "lg:motion-safe:opacity-0";

/**
 * The desktop composition: 1710×985, centred on its scene and scaled whole by
 * however much that frame has to shrink or grow to fit the screen, width or
 * height, whichever runs out first. `tan(atan2(a, b))` is a/b as a plain
 * number, which `zoom` needs and CSS cannot otherwise divide lengths into.
 * `zoom` rather than `scale` so type and drawings are drawn sharp at the new
 * size. Below `lg` the frame is `display: contents` and its pieces flow in the
 * scene's column.
 *
 * Centred with `inset-0 m-auto`, never a `translate`: the camera moves this
 * element (`story-motion.ts`), and GSAP folds the CSS `translate` property
 * into the transform it writes, so a tween of `y` would wipe the centring out.
 */
export const FRAME = cn(
  "contents",
  "lg:absolute lg:inset-0 lg:m-auto lg:block lg:h-[985px] lg:w-[1710px]",
  "lg:[zoom:min(tan(atan2(100vw,1710px)),tan(atan2(100dvh,985px)))]",
);

/**
 * One scene. Below `lg` a section in the page's column: the headline, then the
 * picture under it. From `lg` a full screen: stacked on the held stage when
 * motion is allowed (`absolute`), and one screen after another, already in
 * their finished state, when it is not.
 *
 * `overflow-x-clip` is safe here and needed: the sliding pieces start outside
 * the column on the phone, and the scroller would otherwise grow a horizontal
 * scrollbar for the length of the tween. It must never go on anything *above*
 * the stage (`story.tsx`), where it would stop `position: sticky` working.
 */
export function Scene({
  id,
  children,
  className,
  staged = false,
  labelledBy,
}: {
  readonly id: string;
  readonly children: ReactNode;
  readonly className?: string;
  /** Starts hidden on the desktop stage: every scene but the first. */
  readonly staged?: boolean;
  readonly labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        // Each scene carries the page's white where scenes are sections one
        // under another; on the held stage the stage carries it once
        // (`Story`), so a scene coming in only shows its frame.
        "relative isolate flex w-full shrink-0 flex-col items-center gap-8 overflow-x-clip bg-card px-6 pt-20 pb-12 text-center md:px-12",
        "lg:h-dvh lg:gap-0 lg:overflow-hidden lg:p-0 lg:motion-safe:absolute lg:motion-safe:inset-0 lg:motion-safe:bg-transparent",
        staged && STAGED,
        className,
      )}
      data-scene={id}
    >
      <div className={FRAME} data-frame>
        {children}
      </div>
    </section>
  );
}

/** The story's type: Prompt semibold in the wordmark's ink. */
export const HEADLINE = "font-story leading-tight font-semibold tracking-tight text-foreground";

/** The places a scene's lines stand in, each line's key: two or three of them. */
const LINE_PLACES = ["first", "second", "third"] as const;

/**
 * A scene's words: two or three short lines, all one size, centred over the
 * picture, the line that matters in the logo mark's blue gradient. The words
 * are a phrase of one running sentence, the way the story is told: a few
 * words a line, so they never crowd the drawings. On `lg` they sit 120 down
 * the frame, 48 high.
 *
 * Each line drops in a beat after the one before (`t`, then every 0.25), or
 * on load in the opening (`intro`). The gradient is clipped to the glyphs;
 * the vertical padding stretches its box over Thai's stacked vowels and tone
 * marks, which would otherwise fall outside it and draw transparent.
 */
export function Lines({
  id,
  lines,
  accent,
  t = 0,
  intro = false,
  still = false,
  as: Tag = "h2",
  className,
}: {
  readonly id?: string;
  readonly lines: readonly string[];
  /** Which line is in the logo's blue. */
  readonly accent: number;
  readonly t?: number;
  /** The opening's lines: on load (`data-intro`), not on the scroll. */
  readonly intro?: boolean;
  /** Off the stage (the ending): in the page's flow, and no motion of its own. */
  readonly still?: boolean;
  readonly as?: "h1" | "h2";
  readonly className?: string;
}) {
  const motion = (i: number) => {
    if (still) return {};
    if (intro) return { "data-intro": "" };
    // `data-line`: the desktop's scene timelines bring the lines in and out
    // (`story-motion.ts`); `data-m` is the phone's reveal.
    return { ...beat("line", t + i * 0.25), "data-line": "" };
  };
  return (
    <Tag
      className={cn(
        HEADLINE,
        "relative flex w-full flex-col items-center text-2xl lg:text-5xl",
        !still && "lg:absolute lg:inset-x-0 lg:top-[120px]",
        className,
      )}
      id={id}
    >
      {/* Keyed by place, not by text: the words change when the saved
          language arrives after the first paint, and a new key would swap in
          an element the timeline never animates. */}
      {LINE_PLACES.slice(0, lines.length).map((place, i) => (
        <span key={place} {...motion(i)} className="block">
          <span className={cn(i === accent && "bg-logo-gradient bg-clip-text py-[0.2em] text-transparent")}>
            <ThaiText>{lines[i]}</ThaiText>
          </span>
        </span>
      ))}
    </Tag>
  );
}

/** The story's drawings. One name each; `ART_SIZE` holds the ones that have landed. */
export type ArtName =
  | "asker_think"
  | "asker_chin"
  | "expert_wave"
  | "ask_walk"
  | "answer_walk"
  | "ask_phone"
  | "ask_call"
  | "ask_relieved"
  | "ask_highfive"
  | "answer_bust"
  | "answer_highfive"
  | "question_mark"
  | "book"
  | "chart"
  | "building_office"
  | "building_condo"
  | "building_shophouse"
  | "tree_round"
  | "tree_tall"
  | "phone"
  | "laptop"
  | "desk"
  | "clock"
  | "id_card"
  | "magnifier"
  | "coin"
  | "jar"
  | "padlock"
  | "star"
  | "uncle"
  | "auntie"
  | "friend"
  | "sofa"
  | "window_room"
  | "desk_lamp"
  | "mug"
  | "plant_big"
  | "office_chair"
  | "sticky_note"
  | "bulb_note"
  | "answer_idea"
  | "window_linen"
  | "white_desk"
  | "desk_chair"
  | "table_lamp"
  | "books_stack"
  | "coffee_cup"
  | "bookshelf"
  | "snake_plant";

/**
 * The pixel size of each drawing in `public/about-story/<name>.webp`, so the
 * image reserves its box before it loads. A drawing not listed yet is drawn as
 * a dashed slot of the same height, which is how the scenes are laid out
 * before their art arrives.
 */
const ART_SIZE: Partial<Record<ArtName, readonly [number, number]>> = {
  asker_think: [395, 1148],
  asker_chin: [289, 1122],
  expert_wave: [367, 1198],
  ask_walk: [439, 1100],
  answer_walk: [465, 1100],
  ask_phone: [338, 1137],
  ask_call: [600, 1122],
  ask_relieved: [364, 1136],
  ask_highfive: [468, 1200],
  answer_bust: [519, 900],
  answer_highfive: [312, 1184],
  uncle: [562, 1036],
  auntie: [460, 1195],
  friend: [600, 1112],
  desk: [898, 524],
  sofa: [832, 640],
  id_card: [650, 331],
  magnifier: [344, 660],
  coin: [202, 200],
  jar: [442, 800],
  padlock: [140, 220],
  clock: [481, 480],
  book: [351, 320],
  question_mark: [266, 340],
  building_office: [539, 1039],
  building_condo: [478, 915],
  building_shophouse: [1128, 481],
  tree_round: [590, 840],
  tree_tall: [289, 1120],
  star: [265, 260],
  laptop: [471, 320],
  window_room: [508, 1000],
  desk_lamp: [246, 440],
  mug: [159, 150],
  plant_big: [736, 1040],
  office_chair: [482, 760],
  sticky_note: [234, 240],
  bulb_note: [240, 240],
  answer_idea: [343, 1152],
  window_linen: [666, 1000],
  white_desk: [756, 600],
  desk_chair: [371, 700],
  table_lamp: [181, 340],
  books_stack: [310, 130],
  coffee_cup: [94, 150],
  bookshelf: [495, 1000],
  snake_plant: [366, 900],
};

/**
 * One drawing: crayon on transparent, sized by its height (`className` sets
 * `h-*`; the width follows). Decorative: the headline says what it shows.
 */
export function Art({ name, className }: { readonly name: ArtName; readonly className?: string }) {
  const size = ART_SIZE[name];
  if (!size) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex aspect-[3/4] items-center justify-center rounded-3xl border-2 border-dashed border-border font-latin text-xs text-muted-foreground lg:text-base",
          className,
        )}
      >
        {name}
      </span>
    );
  }
  return (
    <Image
      alt=""
      className={cn("w-auto max-w-none select-none", className)}
      draggable={false}
      height={size[1]}
      src={`/about-story/${name}.webp`}
      width={size[0]}
    />
  );
}

/**
 * Where a scene's drawings stand. On the phone a box under the headline that
 * the pieces are placed in by percentage; from `lg` it dissolves
 * (`contents`) and each piece takes its place on the frame.
 */
export function Stage({
  children,
  className,
  "data-part": part,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  /** Names the whole set for the timeline, when the camera moves it as one. */
  readonly "data-part"?: string;
}) {
  return (
    <div className={cn("relative w-full max-w-sm lg:contents", className)} data-part={part}>
      {children}
    </div>
  );
}
