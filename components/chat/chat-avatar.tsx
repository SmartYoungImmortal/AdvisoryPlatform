import Image, { type StaticImageData } from "next/image";
import { BadgeCheck, MessageSquare, UserRound } from "lucide-react";

import { heroCardFor } from "@/lib/catalogue/live";
import type { ApiPublicAdvisor } from "@/lib/api/types";
import { heroCards, sarahJenskins as sarah } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * The face to show for a listed advisor: the photograph their home-hero card
 * carries when they stand on the ring, so one person has one face across the
 * product (`lib/catalogue/live.ts` does the same for the search cards), and
 * otherwise the portrait URL the API hands out. `null` when there is neither.
 */
export function faceFor(advisor: ApiPublicAdvisor | null): StaticImageData | null {
  if (!advisor) return null;
  const card = heroCardFor(advisor.displayName);
  if (card) return heroCards[card].face;
  return advisor.image ? { src: advisor.image, width: 128, height: 128 } : null;
}

/** The disc itself, in the order `PersonAvatar` describes. */
function AvatarFace({
  face,
  initial,
  known,
  size,
}: {
  readonly face: StaticImageData | null;
  readonly initial: string;
  readonly known: boolean;
  readonly size: number;
}) {
  if (face) {
    return <Image alt="" className="size-full rounded-full bg-muted object-cover" height={size} src={face} width={size} />;
  }
  if (initial) {
    return (
      <span
        className="flex size-full items-center justify-center rounded-full bg-muted font-medium text-foreground"
        style={{ fontSize: Math.round(size * 0.4) }}
      >
        {initial}
      </span>
    );
  }
  if (known) {
    return (
      <span className="flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserRound style={{ width: size * 0.48, height: size * 0.48 }} />
      </span>
    );
  }
  return <ChatMark className="size-full" size={size} />;
}

/**
 * The other person in a conversation: their face, else the first letter of
 * their name, else a person glyph when we know someone is there but not who,
 * else the chat glyph when nobody can be told at all. An initial is only ever
 * taken from a real name, never from a stand-in like "ผู้เชี่ยวชาญ".
 *
 * A listed advisor's own face comes first (see `faceFor`); `person`, the room's
 * other member as the API names them, covers everyone else, an Advisee seen by
 * their advisor included.
 *
 * `verified` puts the check on the corner. It is only ever true for a listed
 * advisor, and a listed advisor is one an admin has identity-checked — see
 * `Counterpart` in `./chat-logic`. Decorative here: the name beside it says
 * "verified" in words for a screen reader.
 */
export function PersonAvatar({
  advisor,
  person = null,
  known = false,
  size,
  verified = false,
  className,
}: {
  readonly advisor: ApiPublicAdvisor | null;
  readonly person?: { readonly displayName: string; readonly image: string | null } | null;
  /** Someone is on the other side, though they cannot be named. */
  readonly known?: boolean;
  readonly size: number;
  readonly verified?: boolean;
  readonly className?: string;
}) {
  const face = faceFor(advisor) ?? (person?.image ? { src: person.image, width: 128, height: 128 } : null);
  const initial = (advisor?.displayName ?? person?.displayName ?? "").trim().slice(0, 1);
  const badge = Math.max(14, Math.round(size * 0.36));

  return (
    <span
      aria-hidden
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <AvatarFace face={face} initial={initial} known={known} size={size} />
      {verified ? (
        <span
          className="absolute -end-0.5 -bottom-0.5 flex items-center justify-center rounded-full bg-card"
          style={{ width: badge, height: badge }}
        >
          <BadgeCheck
            className="fill-primary text-primary-foreground"
            style={{ width: badge, height: badge }}
          />
        </span>
      ) : null}
    </span>
  );
}

/**
 * The portrait slot with nothing to put in it.
 *
 * A room whose other member cannot be told (an anonymous room, or one from an
 * API older than `ChatRoomResponseDto.counterpart` that nobody has written in)
 * has no face to show, and no route presigns another user's uploaded avatar the
 * way `GET /users/me/avatar` does for your own. `ChatAvatar`'s default — a stock
 * portrait of a person called Sarah Jenskins — would be a claim about the data
 * rather than a placeholder for it.
 *
 * A glyph on the muted step says "a conversation" without saying who with. It is
 * what the header, the inbox row and the partner's bubble all use; `ChatAvatar`
 * stays exactly as it was for the screens that still render fixtures.
 */
export function ChatMark({
  size,
  className,
}: {
  readonly size: number;
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <MessageSquare style={{ width: size * 0.45, height: size * 0.45 }} />
    </span>
  );
}

/**
 * Figma "Skeleton / Placeholder Avatar" — a round box with the source photo scaled
 * and offset by the crop Figma reports, rather than a plain object-cover.
 */
export function ChatAvatar({
  src = sarah,
  alt = "",
  size,
  crop = true,
  presence,
  className,
}: {
  readonly src?: StaticImageData;
  readonly alt?: string;
  readonly size: number;
  readonly crop?: boolean;
  /**
   * The dot on the corner of the portrait. Decorative on purpose: the prototype
   * has no presence signal to be right about, and a coloured dot is never the
   * only carrier of anything a reader needs — see `StatusPill` for the states
   * that are.
   */
  readonly presence?: "online" | "away";
  readonly className?: string;
}) {
  const portrait = (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full",
        presence ? undefined : className,
      )}
      style={{ width: size, height: size }}
    >
      {crop ? (
        <Image
          alt={alt}
          className="absolute max-w-none"
          src={src}
          style={{
            width: "258.46%",
            height: "169.66%",
            left: "-90.77%",
            top: "-3.01%",
          }}
        />
      ) : (
        <Image alt={alt} className="absolute inset-0 size-full object-cover" src={src} />
      )}
    </span>
  );

  if (!presence) return portrait;

  // The dot has to sit *outside* the clipping box the crop needs, so the badge
  // is a second wrapper rather than another child of the portrait.
  return (
    <span className={cn("relative block shrink-0", className)}>
      {portrait}
      <span
        aria-hidden
        className={cn(
          "absolute end-0 bottom-0 rounded-full ring-2 ring-card",
          size >= 40 ? "size-3" : "size-2.5",
          presence === "online" ? "bg-success" : "bg-dimmed",
        )}
      />
    </span>
  );
}
