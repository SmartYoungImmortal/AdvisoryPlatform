import { CircleCheck, FileText, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { reportCategories, type ReportCategory } from "@/lib/reports/categories";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { cn } from "@/lib/utils";

/** The message key carrying each reason's Thai label. */
const REASON_KEYS = {
  "off-platform": "reasonOffPlatform",
  scam: "reasonScam",
  harassment: "reasonHarassment",
  spam: "reasonSpam",
  misrepresentation: "reasonMisrepresentation",
  other: "reasonOther",
} as const satisfies Record<ReportCategory, string>;

/** Figma "Field label" — the 14/20 medium line above each group. */
function FieldLabel({ children }: { readonly children: ReactNode }) {
  return (
    <p className="w-full text-sm font-medium text-foreground">{children}</p>
  );
}

/**
 * Figma "File / …" (1456:19404) — an attached piece of evidence.
 *
 * `EvidenceGrid` in the admin console renders evidence as anonymous tiles from a
 * count, so it cannot show a filename or carry a delete control; this row is its
 * reporter-side counterpart.
 */
function EvidenceRow({
  name,
  meta,
  changeLabel,
  deleteLabel,
}: {
  readonly name: string;
  readonly meta: string;
  readonly changeLabel: string;
  readonly deleteLabel: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2.5 overflow-clip rounded-[12px] border bg-card py-2.5 pr-2 pl-3">
      <FileText aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full truncate font-latin text-sm font-medium text-foreground">
          {name}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          <ThaiText>{meta}</ThaiText>
        </p>
      </div>
      <p className="shrink-0 text-sm font-medium whitespace-nowrap text-primary">
        {changeLabel}
      </p>
      <Button
        aria-label={deleteLabel}
        className="size-7 shrink-0 rounded-md text-destructive hover:text-destructive"
        size="icon"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

/**
 * Figma "Report - Create (Light)" — 1456:19360.
 *
 * The reporter-facing half of a flow whose moderation half already shipped: the
 * admin console has triaged `UserReport` records since the wireframes, but no
 * screen ever created one. The reasons come from `lib/reports/categories`, the
 * same list the console labels, so the two cannot drift.
 *
 * A server component. Base UI's radio and switch carry their own `"use client"`,
 * so they select and toggle uncontrolled — the pattern `register-screen` already
 * uses for `Checkbox`. The counter reads 0/500 because that is the state the
 * frame draws; it is not wired to the textarea.
 *
 * The frame paints the heading, body and actions on `--card` over the `--background`
 * frame, so the form reads as a sheet rather than as the page.
 */
export function ReportScreen({ threadId }: { readonly threadId: string }) {
  const t = useTranslations("report");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <ScreenTopBar href={`/chat/${threadId}`} label={c("back")} />
      <ScreenBody className="bg-card">
        {/* Figma "Heading" — 20/28, not the app's 28/40 `ScreenHeading`. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-1 overflow-clip px-6 pt-4 pb-2">
          <h1 className="w-full text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="w-full text-sm font-normal text-muted-foreground">
            <ThaiText>{t("subtitle")}</ThaiText>
          </p>
        </div>

        {/* Figma "Body" */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-2 pb-5">
          {/* Figma "Reason group" */}
          <fieldset className="flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip">
            <legend className="sr-only">{t("reasonLabel")}</legend>
            <FieldLabel>{t("reasonLabel")}</FieldLabel>
            <RadioGroup
              className="flex w-full flex-col gap-2"
              defaultValue="off-platform"
            >
              {reportCategories.map((category) => (
                <label
                  className={cn(
                    // The selected card is the only place the accent fills a
                    // surface rather than a control, so it gets the 1.5px stroke
                    // the frame draws to hold its weight against the plain rows.
                    "group flex w-full shrink-0 cursor-pointer items-center gap-3 overflow-clip rounded-[12px] px-3.5 py-4",
                    "border bg-card has-data-checked:border-[1.5px] has-data-checked:border-primary has-data-checked:bg-accent-surface",
                  )}
                  key={category}
                >
                  <RadioGroupItem className="size-5" value={category} />
                  <span className="min-w-px flex-1 text-base font-normal text-foreground group-has-data-checked:font-medium">
                    {t(REASON_KEYS[category])}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          {/* Figma "Details" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip">
            <FieldLabel>{t("detailsLabel")}</FieldLabel>
            <div className="flex h-26 w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-[12px] border bg-card px-3.5 pt-3 pb-2.5">
              <Textarea
                aria-label={t("detailsLabel")}
                className="min-h-px flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 field-sizing-fixed"
                maxLength={500}
                placeholder={t("detailsPlaceholder")}
              />
              <p className="w-full text-right font-latin text-xs font-normal text-muted-foreground">
                {t("detailsCounter")}
              </p>
            </div>
          </div>

          {/* Figma "Evidence" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip">
            <FieldLabel>{t("evidenceLabel")}</FieldLabel>
            <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
              <EvidenceRow
                changeLabel={t("evidenceChange")}
                deleteLabel={t("evidenceDelete")}
                meta={t("evidenceFile1Meta")}
                name={t("evidenceFile1")}
              />
              <EvidenceRow
                changeLabel={t("evidenceChange")}
                deleteLabel={t("evidenceDelete")}
                meta={t("evidenceFile2Meta")}
                name={t("evidenceFile2")}
              />
            </div>
            {/* `DropZone` in onboarding/parts is a vertical stack on the card
                surface; this frame draws a single centred row on the muted one. */}
            <div className="flex w-full shrink-0 items-center justify-center gap-2 overflow-clip rounded-[12px] border border-dashed bg-muted p-3.5">
              <Upload aria-hidden className="size-4.5 shrink-0 text-primary" />
              <p className="text-sm font-medium whitespace-nowrap text-primary">
                {t("evidenceUpload")}
              </p>
            </div>
            <p className="w-full text-xs font-normal text-muted-foreground">
              <ThaiText>{t("evidenceHint")}</ThaiText>
            </p>
          </div>

          {/* Figma "Block row" */}
          <label className="flex w-full shrink-0 cursor-pointer items-center gap-3 overflow-clip rounded-[12px] border bg-card px-3.5 py-3">
            <span className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <span className="w-full text-sm font-medium text-foreground">
                {t("blockTitle")}
              </span>
              <span className="w-full text-xs font-normal text-muted-foreground">
                <ThaiText>{t("blockBody")}</ThaiText>
              </span>
            </span>
            <Switch />
          </label>
        </div>

        {/* No spacer: the frame is 1178px, so the action scrolls with the form
            rather than being pinned to a viewport it never fits inside. */}
        <ScreenActions className="bg-card pb-2">
          <PrimaryButton href={`/chat/${threadId}/report/submitted`}>
            {t("submit")}
          </PrimaryButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Summary" row — a 70px label column against a right-aligned value. */
function SummaryRow({
  label,
  value,
}: {
  readonly label: ReactNode;
  readonly value: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
      <p className="w-[70px] shrink-0 text-xs font-normal text-muted-foreground">
        {label}
      </p>
      <p className="min-w-px flex-1 text-right text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

/**
 * Figma "Report - Submitted (Light)" — 1456:19433.
 *
 * No top bar in the frame: the report is filed, so there is nothing to go back
 * to and the only way on is the action at the bottom. Spacers above and below
 * centre the body in the viewport, which is how every other result screen in the
 * app is built.
 *
 * The badge is a tinted circle with a lucide glyph rather than the frame's 56px
 * exported SVG — that is how `StatusHero` and the payment results compose theirs,
 * and it follows `--success` instead of baking one green in.
 */
export function ReportSubmittedScreen({
  threadId,
}: {
  readonly threadId: string;
}) {
  const t = useTranslations("report");

  return (
    <MobileScreen>
      <ScreenBody>
        <ScreenSpacer />

        <div className="flex w-full shrink-0 flex-col items-center gap-3.5 overflow-clip px-6 pt-6 pb-5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-success/10">
            <CircleCheck className="size-7 text-success" />
          </span>
          <p className="w-full text-center text-2xl font-semibold text-foreground">
            {t("submittedTitle")}
          </p>
          <p className="w-full text-center text-sm font-normal text-muted-foreground">
            <ThaiText>{t("submittedBody")}</ThaiText>
          </p>

          <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-[12px] border bg-muted p-3.5">
            <SummaryRow
              label={t("summaryReason")}
              value={t("reasonOffPlatform")}
            />
            <SummaryRow
              label={t("summaryEvidence")}
              value={<span className="font-latin">{t("summaryEvidenceValue")}</span>}
            />
            <SummaryRow
              label={t("summaryBlock")}
              value={t("summaryBlockValue")}
            />
          </div>

          <p className="w-full text-center text-xs font-normal text-muted-foreground">
            <ThaiText>{t("submittedFootnote")}</ThaiText>
          </p>
        </div>

        <ScreenSpacer />

        <ScreenActions className="pb-2">
          <PrimaryButton href={`/chat/${threadId}`}>{t("done")}</PrimaryButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}
