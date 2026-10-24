import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

/**
 * The hero's two curves, by name, so a GSAP tween lands exactly the way the CSS
 * on the ring does rather than on a near miss like `back.out`.
 *
 * - `THROW` is `animate-hero-pop`'s `cubic-bezier(0.34, 1.56, 0.64, 1)`: the
 *   overshoot a card makes as it is thrown out to its place.
 * - `SETTLE` is `.hero-card-face`'s `cubic-bezier(0.16, 1, 0.3, 1)`: a quick
 *   start that eases into place without overshooting, for things that should
 *   arrive rather than bounce.
 */
export const THROW = CustomEase.create("advisory-throw", "0.34,1.56,0.64,1");
export const SETTLE = CustomEase.create("advisory-settle", "0.16,1,0.3,1");
