import type { StaticImageData } from "next/image";

import {
  advisor,
  arayaS,
  christopherNolan,
  jamesGunn,
  sarahJenskins,
} from "@/lib/assets/r2";
import type { Account, AvatarKey } from "@/lib/mock-db/types";

const AVATARS: Record<AvatarKey, StaticImageData> = {
  araya: arayaS,
  sarah: sarahJenskins,
  christopher: christopherNolan,
  james: jamesGunn,
  advisor,
};

/** The portrait behind a stored key, or `null` when the account has none. */
export function avatarImage(key: AvatarKey | null): StaticImageData | null {
  return key ? AVATARS[key] : null;
}

/** "Sarah Jenskins" → "SJ", "อารยา ส." → "อส" — the fallback inside an avatar. */
export function initials(account: Pick<Account, "name">): string {
  const words = account.name.replace(/\./g, "").split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => Array.from(word)[0] ?? "");
  return letters.join("").toUpperCase();
}
