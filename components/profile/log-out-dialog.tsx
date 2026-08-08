import { useTranslations } from "next-intl";

import { DestructiveButton, NeutralButton } from "@/components/mobile/buttons";

/**
 * Figma "Log out confirm" (995:7665): a full-frame scrim over a 326 x 194 dialog —
 * surface, 16px radius, 20px padding, 16px gap.
 *
 * Figma pins the dialog at y=334, which sits 6px above the frame's optical centre;
 * we centre it instead so it stays centred at any viewport height.
 */
export function LogOutDialog() {
  const t = useTranslations("logOut");

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      {/* The hairline is an inset ring rather than a border so the 326px frame
          keeps a full 286px of inner width — with a border it drops to 284 and
          the body copy wraps to a second line. */}
      <div
        aria-modal
        className="relative flex w-[326px] flex-col items-start gap-4 overflow-clip rounded-[16px] bg-card p-5 ring-1 ring-border ring-inset"
        role="dialog"
      >
        <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
          <p className="font-thai w-full text-[20px] leading-[28px] font-semibold text-foreground">
            {t("title")}
          </p>
          <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-muted-foreground">
            {t("body")}
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col items-start gap-[10px] overflow-clip">
          <DestructiveButton href="/login">{t("confirm")}</DestructiveButton>
          <NeutralButton href="/profile">{t("cancel")}</NeutralButton>
        </div>
      </div>
    </div>
  );
}
