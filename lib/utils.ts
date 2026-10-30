import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * `text-fine` and the sheet titles' steps are size steps of the theme's own
 * (`app/globals.css`); told so, the merge drops a `text-sm` they override
 * instead of taking them for a colour and dropping the colour beside them.
 */
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["fine", "frame-headline", "display-xs", "display-sm"] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * `value` without any of `chars` at its end. A loop rather than a regex like
 * `/\/+$/`, whose quantifier before `$` backtracks on a long run that is not at
 * the end.
 */
export function trimTrailing(value: string, chars: string): string {
  let end = value.length
  while (end > 0 && chars.includes(value[end - 1])) end -= 1
  return value.slice(0, end)
}
