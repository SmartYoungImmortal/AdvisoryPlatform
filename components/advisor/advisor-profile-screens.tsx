"use client";

import Link from "next/link";
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  Landmark,
  UserRoundCog,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EntryDialog, SelectField, TextField } from "@/components/advisor/edit-fields";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { AddRow } from "@/components/mobile/settings-list";
import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import { Surface, SurfaceList } from "@/components/mobile/surface";
import { authPill } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { DESK_BOX, DESK_GLYPH, DESK_PILL, DeskPage } from "@/components/work/desk-page";
import { WorkEarningsScreen } from "@/components/work/work-screens";
import { cn } from "@/lib/utils";

/** Figma "Skill management (Light)" — 995:8768. */
export function SkillManagementScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  // Three review outcomes that used to be three shades of 12px text — approved in
  // grey, in-review in accent, rejected in red — so "อนุมัติแล้ว" and "กำลังตรวจสอบ"
  // read as the same kind of note. A proof's state is a status, and statuses are
  // pills here.
  const skills: ReadonlyArray<{
    readonly name: string;
    readonly meta: string;
    readonly tone: StatusTone;
  }> = [
    { name: t("skill1"), meta: t("skill1Meta"), tone: "success" },
    { name: t("skill2"), meta: t("skill2Meta"), tone: "success" },
    { name: t("skill3"), meta: t("skill3Meta"), tone: "warning" },
    { name: t("skill4"), meta: t("skill4Meta"), tone: "danger" },
  ];

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/advisor/edit" label={c("back")} />
      <ScreenBody className="lg:[&>*:not(.sticky)]:mx-auto lg:[&>*:not(.sticky)]:w-full lg:[&>*:not(.sticky)]:max-w-[880px]">
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("skillsSubtitle")}
          title={t("skillsTitle")}
        />

        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("yourSkills")}
          </p>
          <SurfaceList>
            {skills.map((s) => {
              // "อนุมัติแล้ว · methodology-cert.pdf" — the state, then the evidence.
              const [state, ...rest] = s.meta.split(" · ");
              return (
                <div
                  className="flex w-full items-center gap-3 p-3.5 transition-colors hover:bg-muted/50"
                  key={s.name}
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
                    <p className="w-full text-sm font-medium text-foreground">
                      {s.name}
                    </p>
                    <div className="flex w-full min-w-px items-center gap-2 overflow-clip">
                      <StatusPill tone={s.tone}>{state}</StatusPill>
                      {rest.length > 0 ? (
                        <p className="min-w-px truncate font-latin text-xs font-normal text-muted-foreground">
                          {rest.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
              );
            })}
            <AddRow label={t("addSkill")} />
          </SurfaceList>
        </div>

        <ScreenSpacer />
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * `/earnings/payout-account/setup`: the payout account page with its popup
 * open, so the addresses that led here (a failed payout's "fix the
 * details") still land on the form.
 */
export function PayoutSetupScreen() {
  return <PayoutAccountScreen setup />;
}

const BANKS = ["BBL", "KBANK", "SCB", "KTB", "BAY", "TTB", "GSB", "BAAC", "UOB", "CIMBT", "KKP", "LHB"] as const;
type Bank = (typeof BANKS)[number];

/**
 * The account payouts go to, as a popup over the payout account page: the
 * bank from the list, the number (10 to 12 digits, spaces and dashes
 * allowed), and the name as the passbook has it.
 *
 * Nothing is stored yet: the API has a table for an advisor's payout
 * account but no route that writes it, so a valid form only closes.
 */
function PayoutAccountDialog({ adding, onClose }: { readonly adding: boolean; readonly onClose: () => void }) {
  const t = useTranslations("advisor");
  const [bank, setBank] = useState<Bank | "">("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<{ bank?: string; number?: string; name?: string }>({});

  const submit = () => {
    const digits = number.replace(/[\s-]/g, "");
    const found: typeof errors = {};
    if (!bank) found.bank = t("bankRequired");
    if (!/^\d{10,12}$/.test(digits)) found.number = t("accountNoInvalid");
    if (!name.trim()) found.name = t("accountNameRequired");
    setErrors(found);
    if (Object.keys(found).length === 0) onClose();
  };

  return (
    <EntryDialog
      focusId="payout-bank"
      onOpenChange={(next) => (next ? null : onClose())}
      onSubmit={submit}
      open
      submitLabel={t("saveAccount")}
      title={adding ? t("payoutSetupTitle") : t("payoutChangeTitle")}
    >
      <SelectField
        id="payout-bank"
        items={BANKS.map((code) => ({ value: code, label: t(`banks.${code}`) }))}
        label={t("bankLabel")}
        onChange={setBank}
        placeholder={t("bankPlaceholder")}
        value={bank}
      />
      {errors.bank ? (
        <p className="-mt-2 text-sm text-destructive" role="alert">
          {errors.bank}
        </p>
      ) : null}
      <TextField
        error={errors.number}
        id="payout-number"
        inputMode="numeric"
        label={t("accountNoLabel")}
        onChange={setNumber}
        placeholder={t("accountNoPlaceholder")}
        value={number}
      />
      <TextField
        error={errors.name}
        hint={t("accountNameHint")}
        id="payout-name"
        label={t("accountNameLabel")}
        onChange={setName}
        placeholder={t("accountNamePlaceholder")}
        value={name}
      />
    </EntryDialog>
  );
}

/**
 * `/earnings/payout-account`: the account payouts go to, on the desk's frame —
 * the bank and the masked number with whether it is verified, the account's
 * name and how it is paid, then changing it in a popup over the page
 * (`PayoutAccountDialog`); `setup` opens with it up.
 *
 * The figures are still the prototype's: the API has a table for an advisor's
 * payout account but no route that reads or writes it yet.
 */
export function PayoutAccountScreen({ setup = false }: { readonly setup?: boolean }) {
  const t = useTranslations("advisor");
  const router = useRouter();
  const [changing, setChanging] = useState(setup);

  const close = () => {
    setChanging(false);
    // Opened by its own address: the address goes back to the page's.
    if (setup) router.replace("/earnings/payout-account");
  };

  return (
    <DeskPage backHref="/work/earnings" title={t("payoutTitle")}>
      <div className="mt-5 flex w-full max-w-200 flex-col gap-8 lg:mt-8 lg:gap-10">
        <div className={cn(DESK_BOX, "flex flex-col px-4 py-2 lg:px-6 lg:py-3")}>
          <div className="flex items-center gap-3 py-3 lg:gap-5 lg:py-4">
            <span className={DESK_GLYPH}>
              <Landmark aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
              <span className="truncate text-sm font-medium text-foreground lg:text-frame-body">{t("bankName")}</span>
              <span className="truncate font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-meta">{t("bankAccount")}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-success lg:text-frame-label">
              <CircleCheck aria-hidden className="size-3.5" />
              {t("verified")}
            </span>
          </div>
          <dl className="flex flex-col border-t border-border">
            {[
              { label: t("accountNameLabel"), value: <span className="font-latin">{t("accountNameValue")}</span> },
              { label: t("payoutTypeLabel"), value: t("payoutTypeValue") },
            ].map((row) => (
              <div className="flex items-baseline justify-between gap-4 border-b border-border py-3.5 last:border-b-0 lg:py-4" key={row.label}>
                <dt className="text-sm text-muted-foreground lg:text-frame-meta">{row.label}</dt>
                <dd className="text-sm font-medium text-foreground lg:text-frame-body">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex w-full items-center gap-3 lg:justify-end">
          <Button className={cn(authPill(false), DESK_PILL, "flex-1 lg:flex-none")} nativeButton={false} render={<Link href="/work/earnings" />} variant="outline">
            {t("deleteAccount")}
          </Button>
          <Button className={cn(authPill(true), DESK_PILL, "flex-1 lg:flex-none")} onClick={() => setChanging(true)} type="button">
            {t("changeAccount")}
          </Button>
        </div>
      </div>
      {changing ? <PayoutAccountDialog adding={false} onClose={close} /> : null}
    </DeskPage>
  );
}

/** Figma "Payout detail - Failed (Light)" — 995:8950. */
export function PayoutFailedScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/earnings/payout-history" label={c("back")} />
      <ScreenBody className="lg:[&>*:not(.sticky)]:mx-auto lg:[&>*:not(.sticky)]:w-full lg:[&>*:not(.sticky)]:max-w-[880px]">
        <div className="flex w-full shrink-0 flex-col items-center px-6 pt-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <CircleAlert className="size-5 text-destructive" />
          </span>
          {/* The one 28px figure on the screen; every other amount below is 14px. */}
          <p className="font-latin mt-3 w-full text-center text-heading font-semibold tabular-nums text-foreground">
            {t("payoutFailedAmount")}
          </p>
          <p className="mt-1 w-full text-center text-xs font-normal text-muted-foreground">
            {t("payoutFailedWhen")}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
          {/* A well, not a card: this is reassurance about the figure above it. */}
          <Surface
            className="flex w-full items-start gap-3 p-3.5"
            tier="well"
          >
            <Clock className="size-4 shrink-0 text-primary" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full text-sm font-medium text-foreground">
                {t("fundsSafeTitle")}
              </p>
              <p className="w-full text-xs font-normal text-muted-foreground">
                {t("fundsSafeBody")}
              </p>
            </div>
          </Surface>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
          <Surface className="flex w-full flex-col items-start gap-3 p-3.5 lg:p-4">
            {[
              { icon: Landmark, label: t("payoutAccountLabel"), value: t("payoutAccountValue"), tone: "" },
              { icon: CircleAlert, label: t("reasonLabel"), value: t("reasonValue"), tone: "text-destructive" },
              { icon: UserRoundCog, label: t("bankDataLabel"), value: t("bankDataValue"), tone: "" },
              { icon: FileText, label: t("transferNoLabel"), value: t("transferNoValue"), tone: "" },
            ].map(({ icon: Icon, label, value, tone }) => (
              <div className="flex h-5 w-full items-center gap-2.5" key={label}>
                <Icon className={`size-4 shrink-0 ${tone || "text-muted-foreground"}`} />
                <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                  {label}
                </span>
                <span
                  className={`font-latin shrink-0 text-sm font-medium tabular-nums whitespace-nowrap ${tone || "text-foreground"}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </Surface>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/earnings/payout-account/setup">{t("fixDetails")}</PrimaryButton>
          <NeutralButton href="/earnings">{t("contactSupport")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Payout history (Light)" — 995:9011. */
export function PayoutHistoryScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  const rows = [
    { date: t("po1Date"), meta: t("po1Meta"), amount: t("po1Amount") },
    { date: t("po2Date"), meta: t("po2Meta"), amount: t("po2Amount") },
    { date: t("po3Date"), meta: t("po3Meta"), amount: t("po3Amount") },
  ];

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/earnings" label={c("back")} />
      <ScreenBody className="lg:[&>*:not(.sticky)]:mx-auto lg:[&>*:not(.sticky)]:w-full lg:[&>*:not(.sticky)]:max-w-[880px]">
        <ScreenHeading className="pt-4" title={t("historyTitle")} />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          {/* The year's total is the hero figure — 28px — and the three transfers
              under it are 14px, so the page has one voice and three footnotes. */}
          <Surface className="flex w-full flex-col items-start gap-1 p-3.5 lg:p-4">
            <p className="w-full text-xs font-normal text-muted-foreground">
              {t("historyYearLabel")}
            </p>
            <p className="font-latin w-full text-heading font-semibold tabular-nums text-foreground">
              {t("historyTotal")}
            </p>
            <p className="w-full text-xs font-normal text-muted-foreground">
              {t("historyNote")}
            </p>
          </Surface>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("allTransfers")}
          </p>
          <SurfaceList>
            {rows.map((r) => (
              <Link
                className="flex w-full items-center gap-3 p-3.5 transition-colors hover:bg-muted/50"
                href="/earnings/payout-history/failed"
                key={r.date}
              >
                <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                  <p className="w-full text-sm font-medium text-foreground">
                    {r.date}
                  </p>
                  <p className="w-full font-latin text-xs font-normal tabular-nums text-muted-foreground">
                    {r.meta}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="text-right font-latin text-sm font-medium tabular-nums whitespace-nowrap text-foreground">
                    {r.amount}
                  </p>
                  <StatusPill tone="success">{t("success")}</StatusPill>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </SurfaceList>
        </div>

        <ScreenSpacer />
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * Figma "Advisor - Earnings (Light)" — 995:8682, and now one screen instead of two.
 *
 * There were two earnings screens: this one and `WorkEarningsScreen`, each with its
 * own balance card, its own three-row ledger and its own list of paid sessions, both
 * reading the same `advisor.*` copy. Two screens that show the same money will drift
 * — this one still had no `lg:` layout, no status colour and a withdraw button that
 * spanned the page — so the hub's version survived and `/earnings` renders it. The
 * export stays because the route file is what points at it.
 */
export function EarningsScreen() {
  return <WorkEarningsScreen />;
}
