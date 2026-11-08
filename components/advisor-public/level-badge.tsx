import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { StatusPill } from "@/components/mobile/status-pill";

/** The levels an admin can give an advisor (`advisor_profiles.level`), lowest first. */
export const ADVISOR_LEVELS = [1, 2, 3] as const;
export type AdvisorLevel = (typeof ADVISOR_LEVELS)[number];

/** A level from the API as one of the three, reading anything else (or nothing) as 1. */
export function asAdvisorLevel(level: number | null | undefined): AdvisorLevel {
  return level === 2 || level === 3 ? level : 1;
}

/** The level's name alone ("ผู้เชี่ยวชาญ") and in full ("ระดับ 2 · ผู้เชี่ยวชาญ"), in the reader's language. */
export function useLevelText() {
  const t = useTranslations("advisorProfile");
  const title = useCallback((level: AdvisorLevel) => t(`levelTitle${level}`), [t]);
  const full = useCallback(
    (level: AdvisorLevel) => t("level", { number: level, title: title(level) }),
    [t, title],
  );
  return { title, full };
}

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
