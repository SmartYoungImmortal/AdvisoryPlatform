import { RoleKeys } from "@/lib/roles";
import {
  Briefcase,
  CalendarDays,
  Home,
  LucideIcon,
  MessageSquare,
  UserRound,
  Wallet,
} from "lucide-react";

export const pageKeys = [
  "home",
  "work",
  "bookings",
  "chat",
  "earnings",
  "user",
] as const;

export type PageKeys = (typeof pageKeys)[number];

/**
 * A tab with no entry here has no destination — the tab bar renders it as a
 * plain label rather than a dead link. `bookings` was one of those until Figma
 * 1326:18632 landed.
 */
export const pageHrefs: Partial<Record<PageKeys, string>> = {
  home: "/",
  work: "/work",
  bookings: "/bookings",
  chat: "/chat",
  earnings: "/earnings",
  user: "/profile",
};

export const pages: Record<
  RoleKeys,
  Partial<
    Record<
      PageKeys,
      {
        icon: LucideIcon;
        href?: string;
      }
    >
  >
> = {
  anon: {
    home: {
      icon: Home,
      href: pageHrefs.home,
    },
    bookings: {
      icon: CalendarDays,
      href: pageHrefs.bookings,
    },
    chat: {
      icon: MessageSquare,
      href: pageHrefs.chat,
    },
    user: {
      icon: UserRound,
      href: pageHrefs.user,
    },
  },
  user: {
    home: {
      icon: Home,
      href: pageHrefs.home,
    },
    bookings: {
      icon: CalendarDays,
      href: pageHrefs.bookings,
    },
    chat: {
      icon: MessageSquare,
      href: pageHrefs.chat,
    },
    user: {
      icon: UserRound,
      href: pageHrefs.user,
    },
  },
  // Figma "Advisor - Home" (1374:20712): the Advisor's second tab is the
  // "งานของฉัน" hub. Earnings did not leave — it is one of that hub's three views
  // — so it no longer needs a tab of its own. Order follows the frame.
  advisor: {
    home: {
      icon: Home,
      href: pageHrefs.home,
    },
    work: {
      icon: Briefcase,
      href: pageHrefs.work,
    },
    bookings: {
      icon: CalendarDays,
      href: pageHrefs.bookings,
    },
    chat: {
      icon: MessageSquare,
      href: pageHrefs.chat,
    },
    // An advisor's own profile is the workspace one, not the advisee's.
    user: {
      icon: UserRound,
      href: "/advisor/profile",
    },
  },
  admin: {
    home: {
      icon: Home,
      href: pageHrefs.home,
    },
    bookings: {
      icon: CalendarDays,
      href: pageHrefs.bookings,
    },
    chat: {
      icon: MessageSquare,
      href: pageHrefs.chat,
    },
    earnings: {
      icon: Wallet,
      href: pageHrefs.earnings,
    },
    user: {
      icon: UserRound,
      href: pageHrefs.user,
    },
  },
} as const;
