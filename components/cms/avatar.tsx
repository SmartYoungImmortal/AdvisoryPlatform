import Image from "next/image";

import { avatarImage, initials } from "@/lib/mock-db/avatars";
import type { AvatarKey } from "@/lib/mock-db/types";
import { cn } from "@/lib/utils";

/**
 * Enough of a person to draw one.
 *
 * `avatar` is optional rather than required because the admin API's rows carry an
 * `avatarKey` — a storage key with no route that presigns it for an admin — and
 * not one of the fixture portrait keys. An API-backed table therefore passes a
 * name and nothing else and gets initials, which is the truth: the console has no
 * photograph for that person.
 */
export type CmsPersonLike = {
  readonly name: string;
  readonly avatar?: AvatarKey | null;
};

const SIZE = {
  sm: { box: "size-6 text-xs", px: 24 },
  md: { box: "size-8 text-sm", px: 32 },
  lg: { box: "size-9 text-sm", px: 36 },
  xl: { box: "size-12 text-base", px: 48 },
} as const;

/** Nuxt UI's `UAvatar`: the photo, or initials on the elevated surface. */
export function CmsAvatar({
  account,
  size = "md",
  className,
}: {
  readonly account: CmsPersonLike;
  readonly size?: keyof typeof SIZE;
  readonly className?: string;
}) {
  const image = avatarImage(account.avatar ?? null);
  const { box, px } = SIZE[size];
  return image ? (
    <Image
      alt=""
      className={cn("shrink-0 rounded-full object-cover", box, className)}
      height={px}
      src={image}
      width={px}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
        box,
        className,
      )}
    >
      {initials(account)}
    </span>
  );
}

/** Avatar, name and a muted second line — how every console table names a person. */
export function CmsPerson({
  account,
  detail,
}: {
  readonly account: CmsPersonLike | undefined;
  readonly detail?: string;
}) {
  if (!account) return <span className="text-dimmed">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-3">
      <CmsAvatar account={account} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-highlighted">{account.name}</span>
        {detail ? (
          <span className="truncate font-latin text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </span>
    </span>
  );
}
