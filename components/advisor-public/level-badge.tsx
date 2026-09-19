import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusPill } from "@/components/mobile/status-pill";

/**
 * Figma "Level" — the accent-tinted badge under an advisor's name, on both the
 * public profile and the advisor's own profile.
 *
 * It was hand-rolled: an accent-surface pill with its own padding, glyph size and
 * weight, which is exactly what `StatusPill` is. Same ground, same ink, one
 * object — so the level badge and every other status in the app agree on their
 * metrics instead of being a pixel apart.
 */
export function LevelBadge({
  level,
}: {
  readonly level: { readonly number: number; readonly title: string };
}) {
  const t = useTranslations("advisorProfile");

  return (
    <StatusPill icon={BadgeCheck} tone="accent">
      {t("level", { number: level.number, title: level.title })}
    </StatusPill>
  );
}
