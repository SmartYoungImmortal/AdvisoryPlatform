import { RoleKeys } from "@/lib/roles";
import {
  CalendarDays,
  Home,
  LucideIcon,
  MessageSquare,
  UserRound,
  Wallet,
} from "lucide-react";

export const pageKeys = [
  "home",
  "bookings",
  "chat",
  "earnings",
  "user",
] as const;

export type PageKeys = (typeof pageKeys)[number];

/**
 * `bookings` has no Figma frame yet, so it has no destination — the tab bar
 * renders those entries as plain labels instead of dead links.
 */
export const pageHrefs: Partial<Record<PageKeys, string>> = {
  home: "/",
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
  advisor: {
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
