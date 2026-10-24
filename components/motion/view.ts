/**
 * The scroll container of every screen. The page scrolls inside `ScreenBody`,
 * never the window (`MobileScreen` is `h-dvh overflow-hidden`), so observers and
 * scroll triggers have to measure against this element or nothing ever moves.
 */
export function scrollerOf(el: Element): HTMLElement | undefined {
  return el.closest<HTMLElement>('[data-slot="screen-body"]') ?? undefined;
}

/**
 * Calls `play` once, the first time `el` is properly on screen: its top 15% up
 * from the bottom of the scroller. Returns the disconnect.
 *
 * An IntersectionObserver rather than a ScrollTrigger on purpose. It reads the
 * box where it is actually drawn, transforms included, while ScrollTrigger
 * measures at refresh with every scrubbed tween rewound to its start. On the
 * home page that difference is a whole screen: the hero holds the sections
 * below it still with a counter-move that starts at `-100vh` (`HeroShapes`),
 * so a trigger measured there fires a screen early.
 *
 * Anything already scrolled past (a reload halfway down, an anchor jump) plays
 * at once, so nothing is left waiting invisibly above the reader.
 */
export function onFirstView(el: Element, play: () => void): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const above = entry.boundingClientRect.bottom < (entry.rootBounds?.top ?? 0);
        if (entry.isIntersecting || above) {
          observer.disconnect();
          play();
          return;
        }
      }
    },
    { root: scrollerOf(el) ?? null, rootMargin: "0px 0px -15% 0px", threshold: 0 },
  );
  observer.observe(el);
  return () => observer.disconnect();
}
