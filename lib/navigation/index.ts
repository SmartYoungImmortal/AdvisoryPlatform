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

export const pages: Record<
  RoleKeys,
  Partial<
    Record<
      PageKeys,
      {
        icon: LucideIcon;
      }
    >
  >
> = {
  anon: {
    home: {
      icon: Home,
    },
    bookings: {
      icon: CalendarDays,
    },
    chat: {
      icon: MessageSquare,
    },
    user: {
      icon: UserRound,
    },
  },
  user: {
    home: {
      icon: Home,
    },
    bookings: {
      icon: CalendarDays,
    },
    chat: {
      icon: MessageSquare,
    },
    user: {
      icon: UserRound,
    },
  },
  advisor: {
    home: {
      icon: Home,
    },
    bookings: {
      icon: CalendarDays,
    },
    chat: {
      icon: MessageSquare,
    },
    earnings: {
      icon: Wallet,
    },
    user: {
      icon: UserRound,
    },
  },
  admin: {
    home: {
      icon: Home,
    },
    bookings: {
      icon: CalendarDays,
    },
    chat: {
      icon: MessageSquare,
    },
    earnings: {
      icon: Wallet,
    },
    user: {
      icon: UserRound,
    },
  },
} as const;
