/**
 * The reasons a user can report a conversation for.
 *
 * One list, imported by both halves of the flow: the form a reporter fills in
 * (`components/chat/report-screens.tsx`) and the queue an admin triages
 * (`components/admin/reports-screen.tsx`). They used to be able to drift — the
 * admin type knew three categories while the report frame draws six — and a
 * reason the reporter can pick but the console cannot display is a report that
 * lands nowhere.
 *
 * It lives outside `lib/admin/` so a user-facing screen never has to import from
 * the console's module to name its own reasons.
 *
 * Order is the order Figma 1456:19360 lists them in, and the array is what the
 * form maps over, so the two cannot disagree about sequence either.
 */
export const reportCategories = [
  "off-platform",
  "scam",
  "harassment",
  "spam",
  "misrepresentation",
  "other",
] as const;

export type ReportCategory = (typeof reportCategories)[number];
