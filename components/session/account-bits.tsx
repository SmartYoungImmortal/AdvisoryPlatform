"use client";

import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";

import { LevelBadge } from "@/components/advisor-public/level-badge";
import { avatarImage, initials } from "@/lib/mock-db/avatars";
import { advisorLevelTitles, type Account } from "@/lib/mock-db/types";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Pieces of the signed-in account for screens that are otherwise static.
 *
 * Each takes the frame's fixture as `fallback`, which is what the exported HTML
 * and a signed-out visitor see; once the session is read, the account's own
 * value replaces it.
 */
export function useAccount(): Account | null {
  const session = useSession();
  return session.status === "authenticated" ? session.account : null;
}

export function AccountName({ fallback }: { readonly fallback: string }) {
  return useAccount()?.name ?? fallback;
}

export function AccountEmail({ fallback }: { readonly fallback: string }) {
  return useAccount()?.email ?? fallback;
}

export function AccountStat({
  stat,
  fallback,
}: {
  readonly stat: keyof Account["stats"];
  readonly fallback: string;
}) {
  const account = useAccount();
  return account ? String(account.stats[stat]) : fallback;
}

/**
 * The signed-in advisor's level pill. `fallback` is the static frame's; `none`
 * stands in for a signed-in account that has no level yet — an advisor whose
 * identity is still under review.
 */
export function AccountLevelBadge({
  fallback,
  none,
}: {
  readonly fallback: ReactNode;
  readonly none: ReactNode;
}) {
  const account = useAccount();
  if (!account) return fallback;
  const profile = account.advisor;
  if (!profile || profile.identity !== "verified") return none;
  return (
    <LevelBadge
      level={{ number: profile.level, title: advisorLevelTitles[profile.level] }}
    />
  );
}

/**
 * The account's portrait, or its initials on a muted disc when it has none —
 * a new sign-up has no photo, and borrowing the fixture's would be wrong.
 */
export function AccountAvatar({
  fallback,
  size,
  className,
}: {
  readonly fallback: StaticImageData;
  readonly size: number;
  readonly className?: string;
}) {
  const account = useAccount();
  const image = account ? avatarImage(account.avatar) : fallback;

  if (!image && account) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted font-latin text-sm font-medium text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {initials(account)}
      </span>
    );
  }

  return (
    <Image
      alt=""
      className={cn("shrink-0 rounded-full object-cover", className)}
      height={size}
      src={image ?? fallback}
      style={{ width: size, height: size }}
      width={size}
    />
  );
}
