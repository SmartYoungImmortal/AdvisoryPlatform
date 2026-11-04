import { ScrollTrigger } from "gsap/ScrollTrigger";
import { afterAll } from "vitest";

/**
 * The receipt pieces reach GSAP's ScrollTrigger, which starts a 250 ms
 * interval when it starts up and never stops it. Left running, it can fire
 * after jsdom is torn down and fail a run whose tests all passed, with
 * "requestAnimationFrame is not defined". `isTouch` is set by that same
 * start-up, so a file whose mocks never start it has nothing to stop.
 */
afterAll(() => {
  if (ScrollTrigger.isTouch !== undefined) ScrollTrigger.disable();
});
