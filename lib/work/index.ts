/**
 * The advisor's desk ("งานของฉัน"): three views, each its own address — today,
 * the calendar, and earnings. Earnings is one of the desk's views rather than a
 * tab of its own in the advisor's tab bar.
 */

export type WorkTab = "today" | "calendar" | "earnings";

export const WORK_TAB_HREF: Record<WorkTab, string> = {
  today: "/work",
  calendar: "/work/calendar",
  earnings: "/work/earnings",
};
