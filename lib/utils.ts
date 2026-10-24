import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
