import gsap from "gsap";

/**
 * The home hero holds every block after it still for its first screen of
 * scroll (`HeroShapes`), with a counter-move that starts a screen up. These are
 * the two things a scroll-driven effect in those blocks needs to know about it.
 */

/** The hero's track: the scroll the ring flies apart on. One per page. */
export function heroTrack(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-slot="home-hero-track"]');
}

/**
 * Where an element really is in the scroller, in scroll pixels, whatever is
 * moving it right now.
 *
 * ScrollTrigger measures with the hold's counter-move applied, so a plain
 * `start: "top top"` inside a held block fires a screen early. The block's own
 * live offset (`gsap.getProperty(block, "y")`, scaled by the block's zoom to
 * the 1710 frame) is taken back out, so the answer is the place it scrolls to.
 */
export function scrollTopOf(el: HTMLElement, block: HTMLElement, scroller: HTMLElement): number {
  const zoom = block.getBoundingClientRect().width / block.offsetWidth || 1;
  const held = (Number(gsap.getProperty(block, "y")) || 0) * zoom;
  return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - held;
}

/**
 * How far each child of a group starts pulled in towards the middle of it, and
 * how far it leans, from layout offsets rather than the drawn box (which a
 * running tween has already moved): the start of a throw out from the centre.
 */
export function pulledIn(item: HTMLElement, group: HTMLElement, pull: number) {
  const dx = group.clientWidth / 2 - (item.offsetLeft + item.offsetWidth / 2);
  const dy = group.clientHeight / 2 - (item.offsetTop + item.offsetHeight / 2);
  return {
    xPercent: item.offsetWidth ? (dx / item.offsetWidth) * 100 * pull : 0,
    yPercent: item.offsetHeight ? (dy / item.offsetHeight) * 100 * pull : 0,
    rotation: group.clientWidth ? gsap.utils.clamp(-6, 6, (-dx / group.clientWidth) * 12) : 0,
  };
}
