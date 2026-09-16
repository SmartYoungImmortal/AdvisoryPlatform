import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { ThaiText } from "@/components/mobile/thai-text";
import { SPECIFIC_DATES } from "@/lib/availability/editor";

/** The same read-only trigger the editor uses, kept local to the sheet's own row. */
function TimeTrigger({ value }: { readonly value: string }) {
  return (
    <span className="flex min-w-px flex-1 items-center gap-1 overflow-clip rounded-md border border-border bg-muted py-2 pr-2.5 pl-3">
      <span className="min-w-px flex-1 font-latin text-sm font-medium text-foreground">
        {value}
      </span>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
    </span>
  );
}

/**
 * Figma "Availability - Profile / Add specific date" (1594:31805) — a bottom sheet
 * over the specific-dates tab.
 *
 * A sheet rather than a dialog because the frame draws it anchored to the bottom
 * edge with a grab handle, and because the date it is adding belongs to the list
 * behind it: the list stays visible above the sheet.
 */
export function AddDateSheet() {
  const t = useTranslations("availability");
  const c = useTranslations("common");
  const date = SPECIFIC_DATES[0];

  return (
    <>
      {/* The scrim only covers what the sheet does not, so the list above stays legible. */}
      <div aria-hidden className="absolute inset-0 z-10 bg-scrim/40" />
      <div
        aria-label={t("addSheet.title")}
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-4 rounded-t-2xl bg-card px-6 pt-3 pb-5"
        role="dialog"
      >
        <div
          aria-hidden
          className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border"
        />

        <div className="flex w-full shrink-0 flex-col items-start gap-1.5">
          <h2 className="w-full text-xl leading-7 font-semibold text-foreground">
            {t("addSheet.title")}
          </h2>
          <p className="w-full text-sm font-normal text-muted-foreground">
            <ThaiText>{t("addSheet.subtitle")}</ThaiText>
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-1.5">
          <p className="w-full text-sm font-medium text-foreground">
            {t("addSheet.dateLabel")}
          </p>
          <div className="flex w-full shrink-0 items-center gap-2 overflow-clip rounded-md border border-border bg-card px-3 py-2">
            <span className="min-w-px flex-1 text-sm font-normal text-foreground">
              {date.label}
            </span>
            <Link
              className="shrink-0 text-sm font-medium whitespace-nowrap text-primary"
              href="/availability/profiles/edit/specific"
            >
              {t("addSheet.change")}
            </Link>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-1.5">
          <p className="w-full text-sm font-medium text-foreground">
            {t("addSheet.rangeLabel")}
          </p>
          <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
            <TimeTrigger value={date.ranges[0].start} />
            <span className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
              –
            </span>
            <TimeTrigger value={date.ranges[0].end} />
          </div>
          <Link
            className="w-full text-sm font-medium text-primary"
            href="/availability/profiles/edit/specific"
          >
            {t("addSheet.addAnother")}
          </Link>
          <p className="w-full text-xs font-normal text-muted-foreground">
            <ThaiText>{t("addSheet.hint")}</ThaiText>
          </p>
        </div>

        <div className="flex w-full shrink-0 items-start gap-3">
          <NeutralButton
            className="w-30 shrink-0"
            href="/availability/profiles/edit/specific"
          >
            {c("cancel")}
          </NeutralButton>
          <PrimaryButton
            className="min-w-px flex-1"
            href="/availability/profiles/edit/specific"
          >
            {t("addSheet.confirm")}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
}
