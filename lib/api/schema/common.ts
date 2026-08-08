import { z } from "zod";

import { roleKeys } from "@/lib/roles";

/**
 * Primitives shared by every resource.
 *
 * Two conventions the backend must follow, because getting either wrong is
 * invisible until it reaches the screen:
 *
 * 1. **Money is always minor units** — satang, as an integer. `฿1,200` is
 *    `120000`. Never send a formatted string and never send a float: the UI
 *    renders these through `lib/format/money.ts`, and `1200.1 + 0.2` is not
 *    `1200.3`.
 * 2. **Dates are always ISO 8601 UTC** — `2026-07-28T09:30:00.000Z`. Never a
 *    pre-formatted Thai date. The UI decides the era (the designs use
 *    Gregorian, not Buddhist) and the wording.
 */

export const Id = z.string().min(1);

export const IsoDateTime = z.iso.datetime();

export const Money = z.object({
  /** Satang. `฿1,200` is 120000. Integer — never a float. */
  amountMinor: z.int(),
  currency: z.literal("THB"),
});

/** Mirrors `lib/roles.ts` so the two can never drift apart. */
export const Role = z.enum(roleKeys);

/**
 * Cursor pagination. Cursors are opaque to the client — it only ever echoes
 * `nextCursor` back. The backend is free to change what they encode.
 */
export function Paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
}

export const PageQuery = z.object({
  cursor: z.string().nullish(),
  limit: z.int().min(1).max(100).default(20),
});

export type Id = z.infer<typeof Id>;
export type IsoDateTime = z.infer<typeof IsoDateTime>;
export type Money = z.infer<typeof Money>;
export type Role = z.infer<typeof Role>;
export type PageQuery = z.infer<typeof PageQuery>;
