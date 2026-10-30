import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { BURST } from "@/components/about/story-scenes";
import type { MotionKind } from "@/components/about/story-parts";

gsap.registerPlugin(ScrollTrigger);

/**
 * How the `/about` story moves. Three entry points, each run inside its own
 * `gsap.matchMedia` query by `Story`, so nothing here ever runs under
 * `prefers-reduced-motion` and every tween and trigger is reverted with it:
 *
 * - `playIntro`: the opening on load.
 * - `buildDesktopStory`: from `lg`, the whole story on one held stage, played
 *   by one scrubbed timeline across the track; each scene's pieces move on
 *   their own (`SCENE_MOTION`).
 * - `buildPhoneStory`: below `lg`, each piece arrives once, as it scrolls into
 *   view, in the order it is written.
 *
 * Only transform and opacity are animated, and the picked time slot's colours.
 */

const piecesOf = (root: ParentNode, selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));

/**
 * The angle a piece rests at, from its own `rotate-*` class (`-rotate-6` is
 * -6°). GSAP folds the CSS `rotate` property into the transform it writes and
 * sets the property to `none`, so a tween that turns a piece has to land on
 * this angle rather than on 0.
 *
 * Read from the class rather than the computed style: once GSAP has touched
 * the element (React runs this effect twice in development, and a resize
 * across `lg` rebuilds it), the computed `rotate` is already `none`.
 */
function restingTurn(el: HTMLElement): number {
  const match = /(?:^|\s)(-?)rotate-(\d+)(?=\s|$)/.exec(el.className);
  return match ? Number(match[2]) * (match[1] ? -1 : 1) : 0;
}

/* ── The opening ─────────────────────────────────────────────────────────── */

/** The opening drops in on load. */
export function playIntro(track: HTMLElement) {
  piecesOf(track, '[class*="rotate-"]').forEach((el) => gsap.set(el, { rotation: restingTurn(el) }));

  gsap.from(piecesOf(track, "[data-intro]"), {
    opacity: 0,
    y: 40,
    duration: 1,
    ease: "power2.out",
    stagger: 0.15,
    delay: 0.2,
    clearProps: "opacity,transform",
  });
}

/* ── The desktop: one held stage, one timeline ───────────────────────────── */

type Cut = {
  readonly tl: gsap.core.Timeline;
  readonly scene: HTMLElement;
  /** When the scene starts, in timeline units. */
  readonly at: number;
};

/** A scene's own pieces by name (`data-part` in `story-scenes.tsx`). */
const part = ({ scene }: Cut, name: string) => piecesOf(scene, `[data-part="${name}"]`);

/** The scene's lines rising in one after another, from `delay` after it opens, every `gap`. */
function linesIn(cut: Cut, delay = 0.3, gap = 0.3) {
  piecesOf(cut.scene, "[data-line]").forEach((line, i) =>
    cut.tl.fromTo(line, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, cut.at + delay + i * gap),
  );
}

/** And out again, lifting away, at `when` after it opens. */
function linesOut(cut: Cut, when: number) {
  cut.tl.fromTo(
    piecesOf(cut.scene, "[data-line]"),
    { opacity: 1, y: 0 },
    { opacity: 0, y: -40, duration: 0.4, ease: "power2.in", stagger: 0.08, immediateRender: false },
    cut.at + when,
  );
}

/** Up from below, a little overshoot. */
function riseIn(cut: Cut, els: HTMLElement[], when: number, stagger = 0.2, from = 260) {
  if (els.length === 0) return;
  cut.tl.fromTo(els, { opacity: 0, y: from }, { opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.4)", stagger }, cut.at + when);
}

/** Growing out of nothing at its own angle. */
function popIn(cut: Cut, els: HTMLElement[], when: number, stagger = 0.2) {
  els.forEach((el, i) => {
    const rest = restingTurn(el.firstElementChild as HTMLElement) || 0;
    cut.tl.fromTo(
      el,
      { opacity: 0, scale: 0, rotation: rest + (i % 2 ? 20 : -20) },
      { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2)" },
      cut.at + when + i * stagger,
    );
  });
}

/** Sliding in from a side of the screen. */
function slideIn(cut: Cut, els: HTMLElement[], when: number, from: number, duration = 0.9) {
  if (els.length === 0) return;
  cut.tl.fromTo(els, { opacity: 0, x: from }, { opacity: 1, x: 0, duration, ease: "power3.out" }, cut.at + when);
}

/** Leaving: thrown up and away at `when`, each its own way. */
function flyOut(cut: Cut, els: HTMLElement[], when: number) {
  els.forEach((el, i) =>
    cut.tl.fromTo(
      el,
      { opacity: 1, x: 0, y: 0 },
      {
        opacity: 0,
        x: (i % 2 ? 1 : -1) * (120 + i * 40),
        y: -420 - i * 40,
        duration: 0.6,
        ease: "power2.in",
        immediateRender: false,
      },
      cut.at + when + i * 0.05,
    ),
  );
}

/**
 * A walk across: the part travels `from` to `to` (frame pixels) at an even
 * pace, its body (`data-bob`) bobbing a step at a time on the way.
 */
function walk(cut: Cut, el: HTMLElement | undefined, from: number, to: number, when: number, duration: number) {
  if (!el) return;
  cut.tl.fromTo(el, { opacity: 1, x: from }, { x: to, duration, ease: "none" }, cut.at + when);
  const body = el.querySelector<HTMLElement>("[data-bob]");
  if (body) {
    const steps = Math.max(2, Math.round(duration * 4));
    cut.tl.fromTo(
      body,
      { y: 0 },
      { y: -16, duration: duration / (steps * 2), ease: "sine.inOut", yoyo: true, repeat: steps * 2 - 1 },
      cut.at + when,
    );
  }
}

/**
 * Each scene's choreography, by `data-scene`; each returns the scene's length
 * in timeline units. Scenes dissolve into each other in `buildDesktopStory`.
 */
const SCENE_MOTION: Record<string, (cut: Cut) => number> = {
  open(cut) {
    // The notes pile up round Ask's head as the scroll starts, Ask scratching
    // harder, and the room holds a beat. It does not clear: the camera slides
    // over to the office next door with all of it still in place (`PANS_IN`).
    const length = 2;
    popIn(cut, part(cut, "question").slice(1), 0.1, 0.22);
    cut.tl.fromTo(part(cut, "ask"), { rotation: 0 }, { keyframes: { rotation: [0, -3, 3, -2, 0] }, duration: 1.2 }, cut.at + 0.3);
    return length;
  },

  s1(cut) {
    // The room was there all along, next door to Ask's: the camera has just
    // slid over to it, so everything in it, the lines too, is already in
    // place. It holds a beat, then the lines lift off as the street comes in.
    const length = 1.6;
    linesOut(cut, length - 0.5);
    return length;
  },

  s2(cut) {
    // The street rises, the trees close in from the edges, and the two walk
    // straight past each other with their eyes on their phones.
    const length = 3.8;
    riseIn(cut, part(cut, "building"), 0, 0.2, 600);
    slideIn(cut, part(cut, "tree-left"), 0.3, -500);
    slideIn(cut, part(cut, "tree-right"), 0.3, 500);
    linesIn(cut, 0.4);
    walk(cut, part(cut, "ask")[0], -900, 520, 0.6, 2.6);
    walk(cut, part(cut, "answer")[0], 900, -520, 0.6, 2.6);
    cut.tl.fromTo(part(cut, "building"), { y: 0 }, { y: 600, duration: 0.6, ease: "power2.in", stagger: 0.1, immediateRender: false }, cut.at + length - 0.6);
    linesOut(cut, length - 0.5);
    return length;
  },

  s3(cut) {
    // Everyone arrives at once, and the replies pile up, then scatter.
    const length = 3.4;
    riseIn(cut, part(cut, "ask"), 0.1);
    slideIn(cut, part(cut, "uncle"), 0.3, -700);
    slideIn(cut, part(cut, "auntie"), 0.5, 700);
    popIn(cut, part(cut, "friend"), 0.8);
    linesIn(cut);
    popIn(cut, part(cut, "reply"), 1.1, 0.22);
    flyOut(cut, part(cut, "reply"), length - 0.6);
    linesOut(cut, length - 0.5);
    return length;
  },

  s4(cut) {
    // Ask on the sofa, and Answer's card comes up; its button asks to be pressed.
    const length = 3;
    riseIn(cut, part(cut, "sofa"), 0.1);
    riseIn(cut, part(cut, "ask"), 0.3);
    linesIn(cut);
    riseIn(cut, part(cut, "card"), 1);
    const book = part(cut, "book");
    if (book.length) {
      cut.tl.fromTo(book, { scale: 1 }, { scale: 1.18, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 3 }, cut.at + 1.8);
    }
    linesOut(cut, length - 0.5);
    return length;
  },

  s5(cut) {
    // The times come up and eight o'clock is picked: it fills with the site's
    // ink, as a picked time does on the booking sheet.
    const length = 3;
    riseIn(cut, part(cut, "ask"), 0.1);
    linesIn(cut);
    riseIn(cut, part(cut, "slots"), 0.7, 0, 200);
    popIn(cut, part(cut, "clock"), 0.9);
    const styles = getComputedStyle(document.documentElement);
    const ink = styles.getPropertyValue("--hero-action").trim();
    const paper = styles.getPropertyValue("--hero-action-foreground").trim();
    const pick = part(cut, "pick");
    if (pick.length && ink && paper) {
      cut.tl.fromTo(
        pick,
        { scale: 1 },
        { scale: 1.12, backgroundColor: ink, color: paper, borderColor: ink, duration: 0.3, ease: "back.out(2)" },
        cut.at + 1.7,
      );
      cut.tl.to(pick, { scale: 1, duration: 0.2 }, cut.at + 2);
    }
    linesOut(cut, length - 0.5);
    return length;
  },

  s6(cut) {
    // The joke is in the camera: it opens close on the shirt and the laptop,
    // and pulls back to the pajama pants as the second line lands.
    const length = 3.8;
    const set = part(cut, "set");
    cut.tl.fromTo(
      set,
      { scale: 1.9, transformOrigin: "36% 18%" },
      { scale: 1, transformOrigin: "36% 18%", duration: 1.8, ease: "power2.inOut" },
      cut.at + 0.6,
    );
    const [first, second] = piecesOf(cut.scene, "[data-line]");
    if (first) cut.tl.fromTo(first, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, cut.at + 0.2);
    if (second) cut.tl.fromTo(second, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, cut.at + 2.2);
    linesOut(cut, length - 0.3);
    return length;
  },

  s7(cut) {
    // The card comes up, the magnifier sweeps across it, the badge lands.
    const length = 3.2;
    slideIn(cut, part(cut, "answer"), 0.1, 600);
    linesIn(cut);
    riseIn(cut, part(cut, "card"), 0.5);
    cut.tl.fromTo(
      part(cut, "magnifier"),
      { opacity: 0, x: -260, y: 40, rotation: -14 },
      { keyframes: { opacity: [0, 1, 1, 1], x: [-260, 0, 220, 120], y: [40, -10, 30, 0], rotation: [-14, 0, 10, 0] }, duration: 1.4 },
      cut.at + 0.8,
    );
    const badge = part(cut, "badge");
    if (badge.length) {
      cut.tl.fromTo(badge, { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power4.in" }, cut.at + 2.2);
    }
    linesOut(cut, length - 0.4);
    return length;
  },

  s8(cut) {
    // Ask's coins arc into the jar, the lock comes down, the call's time runs
    // out along the bar, the lock comes off and the coins go to Answer.
    const length = 4.2;
    slideIn(cut, part(cut, "ask"), 0.1, -600);
    slideIn(cut, part(cut, "answer"), 0.2, 600);
    riseIn(cut, part(cut, "jar"), 0.3);
    linesIn(cut);
    const coins = part(cut, "coin");
    coins.forEach((coin, i) => {
      cut.tl.fromTo(
        coin,
        { opacity: 0, x: -470, y: 160, rotation: 0 },
        { keyframes: { opacity: [1, 1, 1], x: [-470, -230, 0], y: [160, -170, 0] }, rotation: 360, duration: 0.7, ease: "none" },
        cut.at + 1 + i * 0.15,
      );
      cut.tl.fromTo(
        coin,
        { x: 0, y: 0 },
        { keyframes: { x: [0, 260, 520], y: [0, -190, 150], opacity: [1, 1, 0] }, rotation: 720, duration: 0.7, ease: "none", immediateRender: false },
        cut.at + 3.3 + i * 0.1,
      );
    });
    cut.tl.fromTo(part(cut, "padlock"), { opacity: 0, y: -400 }, { opacity: 1, y: 0, duration: 0.6, ease: "bounce.out" }, cut.at + 1.9);
    riseIn(cut, part(cut, "talking"), 0.7, 0, 120);
    cut.tl.fromTo(part(cut, "time-left"), { scaleX: 1 }, { scaleX: 0, duration: 0.9, ease: "none" }, cut.at + 2.3);
    cut.tl.fromTo(
      part(cut, "padlock"),
      { y: 0, rotation: 0 },
      { y: -160, rotation: 25, opacity: 0, duration: 0.4, ease: "power2.out", immediateRender: false },
      cut.at + 3.2,
    );
    linesOut(cut, length - 0.4);
    return length;
  },

  s9(cut) {
    // They run in from either side, their hands meet, and everything goes
    // flying from the high five to the corners.
    const length = 3;
    walk(cut, part(cut, "ask")[0], -760, 0, 0.1, 1);
    walk(cut, part(cut, "answer")[0], 760, 0, 0.1, 1);
    part(cut, "burst").forEach((piece, i) => {
      const [x, y] = BURST[i]?.to ?? [0, 0];
      cut.tl.fromTo(
        piece,
        { opacity: 0, x: 0, y: 0, scale: 0, rotation: 0 },
        { opacity: 1, x, y, scale: 1, rotation: (i % 2 ? 1 : -1) * 200, duration: 0.8, ease: "power3.out" },
        cut.at + 1.15,
      );
    });
    linesIn(cut, 1.3);
    return length;
  },
};

/** How long consecutive scenes overlap: the next one fades in over the end of this one. */
const DISSOLVE = 0.5;

/**
 * The scenes the camera slides over to instead of dissolving into: Answer's
 * office is next door to Ask's room, so the whole room, lines and notes and
 * all, slides off to the left as the office slides in from the right, one
 * strip, easing in and out over `PAN`. The scene's own choreography starts
 * once it has arrived.
 */
const PANS_IN = new Set(["s1"]);
const PAN = 1.2;

/**
 * The whole story on one screen. The stage is `position: sticky` on a long
 * track (`Story`); this timeline is scrubbed across the part it holds still
 * for. Never GSAP's `pin`: the page scrolls inside `ScreenBody`, not the
 * window, and with a non-viewport scroller `pin` falls back to transform
 * pinning, which is what breaks scrolling here.
 *
 * The scenes are stacked on the stage, see-through, in the order they are
 * told. Each one fades in over the end of the one before and plays its own
 * choreography (`SCENE_MOTION`) while it is on screen.
 */
export function buildDesktopStory(track: HTMLElement, scroller: HTMLElement) {
  const scenes = piecesOf(track, "[data-scene]");
  if (scenes.length === 0) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: track,
      scroller,
      start: "top top",
      end: "bottom bottom",
      // Half a second of catch-up: trackpad momentum inside an `overflow-y`
      // scroller arrives in coarse steps, and this turns them into motion.
      scrub: 0.5,
      invalidateOnRefresh: true,
    },
  });

  let at = 0;
  scenes.forEach((scene, i) => {
    const play = SCENE_MOTION[scene.dataset.scene ?? ""];
    const panned = PANS_IN.has(scene.dataset.scene ?? "");
    if (i > 0 && !panned) tl.fromTo(scene, { opacity: 0 }, { opacity: 1, duration: DISSOLVE, ease: "power1.inOut" }, at);
    const length = play ? play({ tl, scene, at }) : 2;
    at += length;
    const next = scenes[i + 1];
    if (!next) return;
    if (PANS_IN.has(next.dataset.scene ?? "")) {
      tl.set(next, { opacity: 1 }, at);
      tl.fromTo(scene, { xPercent: 0 }, { xPercent: -100, duration: PAN, ease: "power2.inOut", immediateRender: false }, at);
      tl.fromTo(next, { xPercent: 100 }, { xPercent: 0, duration: PAN, ease: "power2.inOut" }, at);
      at += PAN;
    } else {
      tl.fromTo(scene, { opacity: 1 }, { opacity: 0, duration: DISSOLVE, ease: "power1.inOut", immediateRender: false }, at);
    }
  });
  // The last scene holds a beat before the stage lets go.
  tl.set({}, {}, at + 0.4);

  // Thai type arrives after the first paint and moves every line it sets.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

/* ── The phone: each piece once, as it is reached ────────────────────────── */

const numberOf = (value: string | undefined): number | undefined =>
  value === undefined || value === "" ? undefined : Number(value);

/** Where a piece starts on the phone. Short throws: the column is 354 wide. */
function phoneFrom(el: HTMLElement, rest: number): gsap.TweenVars {
  const turn = rest + (numberOf(el.dataset.r) ?? 0) / 2;
  switch (el.dataset.m as MotionKind) {
    case "line":
      return { opacity: 0, y: -30 };
    case "rise":
      return { opacity: 0, y: 60 };
    case "drop":
      return { opacity: 0, y: -120, rotation: turn };
    case "pop":
      return { opacity: 0, scale: 0.4, rotation: turn };
    case "stamp":
      return { opacity: 0, scale: 1.8, rotation: turn };
    case "left":
      return { opacity: 0, x: -80 };
    case "right":
      return { opacity: 0, x: 80 };
    case "bar":
      return { scaleX: 0 };
    case "ink":
    case "fade":
      return { opacity: 0 };
  }
  return {};
}

function phoneTo(el: HTMLElement, rest: number): gsap.TweenVars {
  switch (el.dataset.m as MotionKind) {
    case "drop":
      return { opacity: 1, y: 0, rotation: rest, duration: 0.9, ease: "bounce.out" };
    case "pop":
      return { opacity: 1, scale: 1, rotation: rest, duration: 0.6, ease: "back.out(1.6)" };
    case "stamp":
      return { opacity: 1, scale: 1, rotation: rest, duration: 0.3, ease: "power4.in" };
    case "bar":
      return { scaleX: 1, duration: 0.5, ease: "power2.out", delay: 0.3 };
    case "ink":
      return { opacity: 1, duration: 0.3, delay: 0.4 };
    case "left":
    case "right":
      return { opacity: 1, x: 0, duration: 0.8, ease: "power3.out" };
    default:
      return { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" };
  }
}

/**
 * Below `lg` the scenes are sections in the page's column. Every piece starts
 * in its kind's starting place and arrives the first time it is properly on
 * screen; pieces that come into view together arrive one after another, in the
 * order they are written. Anything already above the screen (a reload halfway
 * down) arrives at once rather than waiting invisibly overhead.
 *
 * One IntersectionObserver, rooted on the scroller: it reads the box where it
 * is drawn, which is what a reveal needs. An observer only calls back when a
 * piece crosses the screen, though, and a jump (the footer's links, End, a
 * dragged scrollbar) can carry whole scenes past without any of them crossing
 * it; so the scroll also checks, once a frame, for scenes left entirely
 * behind, and puts their pieces straight into place.
 */
export function buildPhoneStory(track: HTMLElement, scroller: HTMLElement) {
  const scenes = piecesOf(track, "[data-scene]").filter((scene) => scene.dataset.scene !== "open");
  const waiting = new Map(scenes.map((scene) => [scene, piecesOf(scene, "[data-m]")]));
  // Read every resting angle before the first `set`, which folds them away.
  const rests = new Map(Array.from(waiting.values()).flat().map((piece) => [piece, restingTurn(piece)]));
  const endOf = (piece: HTMLElement) => phoneTo(piece, rests.get(piece) ?? 0);
  const forget = (piece: HTMLElement) => {
    observer.unobserve(piece);
    for (const [scene, pieces] of waiting) {
      const left = pieces.filter((other) => other !== piece);
      if (left.length === 0) waiting.delete(scene);
      else waiting.set(scene, left);
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const ready = entries
        .filter((entry) => entry.isIntersecting || entry.boundingClientRect.bottom < (entry.rootBounds?.top ?? 0))
        .map((entry) => entry.target as HTMLElement)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      ready.forEach((piece, i) => {
        forget(piece);
        const to = endOf(piece);
        gsap.to(piece, { ...to, delay: Number(to.delay ?? 0) + i * 0.12 });
      });
    },
    { root: scroller, rootMargin: "0px 0px -12% 0px", threshold: 0 },
  );

  for (const piece of rests.keys()) {
    gsap.set(piece, phoneFrom(piece, rests.get(piece) ?? 0));
    observer.observe(piece);
  }

  let frame = 0;
  const settlePassed = () => {
    frame = 0;
    const top = scroller.getBoundingClientRect().top;
    for (const [scene, pieces] of waiting) {
      if (scene.getBoundingClientRect().bottom >= top) continue;
      pieces.forEach((piece) => {
        forget(piece);
        // The end state alone, with no time: nobody is looking at it.
        const end = endOf(piece);
        delete end.duration;
        delete end.ease;
        delete end.delay;
        gsap.set(piece, end);
      });
    }
  };
  const onScroll = () => {
    if (!frame && waiting.size > 0) frame = requestAnimationFrame(settlePassed);
  };
  scroller.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    observer.disconnect();
    scroller.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(frame);
  };
}
