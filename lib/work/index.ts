/**
 * The advisor's desk ("งานของฉัน"): six places, each its own address — today,
 * the calendar, the services, the hours, the requests, and earnings — as one
 * row of capsules that stands on every one of them, so moving between them
 * never moves the page. What one of them opens (a service, a session, a set
 * of hours) is a page of its own with the way back to it.
 */

export type WorkTab = "today" | "calendar" | "services" | "availability" | "requests" | "earnings";

export const WORK_TABS: readonly WorkTab[] = ["today", "calendar", "services", "availability", "requests", "earnings"];

export const WORK_TAB_HREF: Record<WorkTab, string> = {
  today: "/work",
  calendar: "/work/calendar",
  services: "/advisor/services",
  availability: "/availability",
  requests: "/screening/requests",
  earnings: "/work/earnings",
};
