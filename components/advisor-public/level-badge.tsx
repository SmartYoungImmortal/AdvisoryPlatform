import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Figma "Level" — the accent-tinted badge under an advisor's name, on both the
 * public profile and the advisor's own profile.
 */
export function LevelBadge({
  level,
}: {
  readonly level: { readonly number: number; readonly title: string };
}) {
  const t = useTranslations("advisorProfile");

  return (
    <span className="flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-accent-surface py-1.25 pr-3 pl-2.5 text-xs font-normal whitespace-nowrap text-primary">
      <BadgeCheck className="size-3.5 shrink-0" />
      {t("level", { number: level.number, title: level.title })}
    </span>
  );
}
