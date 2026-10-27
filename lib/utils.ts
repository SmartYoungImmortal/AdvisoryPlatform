import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * `text-fine` is a size step of the theme's own (`app/globals.css`); told so,
 * the merge drops a `text-sm` it overrides instead of taking it for a colour
 * and dropping the colour beside it.
 */
const twMerge = extendTailwindMerge({ extend: { theme: { text: ["fine"] } } })

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
