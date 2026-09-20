import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  CreditCard,
  FileText,
  Landmark,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  Star,
  UserRoundCog,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { advisor } from "@/lib/assets/r2";
import { advisorLevel } from "@/lib/catalogue/profiles";
import { getAdvisor } from "@/lib/catalogue/services";
import { cn } from "@/lib/utils";
import { LevelBadge } from "@/components/advisor-public/level-badge";
import {
  AccountAvatar,
  AccountLevelBadge,
  AccountName,
} from "@/components/session/account-bits";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import {
  AddRow,
  SettingsCard,
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from "@/components/mobile/settings-list";
import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import { Surface, SurfaceList, surfaceClass } from "@/components/mobile/surface";
import { QuickActions } from "@/components/profile/quick-actions";
import { WorkEarningsScreen } from "@/components/work/work-screens";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";

/**
 * Figma "Advisor profile - View (Light)" — 995:8633, updated to 1390:25505: the
 * level badge replaces the plain role line, and the tiles and rows that had no
 * destination now open the service list and the "งานของฉัน" hub.
 */
/** The prototype's signed-in Advisor, as the catalogue records her. */
const ME = getAdvisor("sarah-jenskins");

export function AdvisorProfileScreen() {
  const t = useTranslations("advisor");
  // The prototype's signed-in advisor.
  const level = advisorLevel("sarah-jenskins");

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="pb-19.5 lg:[&>*:not(.sticky)]:mx-auto lg:[&>*:not(.sticky)]:w-full lg:[&>*:not(.sticky)]:max-w-[880px]">
        <TopBar unreadNotifications />
        {/* Figma "Identity Card": verified name, role, then rating/booking/review stats. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-4">
          <Surface className="flex w-full flex-col items-start gap-3 p-3.5 lg:p-4">
            <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
              <AccountAvatar className="size-14" fallback={advisor} size={56} />
              <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
                <p className="font-latin flex w-full items-center gap-1 text-base font-medium text-foreground">
                  <AccountName fallback={t("name")} />
                  <BadgeCheck className="size-4 shrink-0 text-primary" />
                </p>
                <AccountLevelBadge
                  fallback={
                    level ? (
                      <LevelBadge level={level} />
                    ) : (
                      <p className="w-full text-xs font-normal text-muted-foreground">
                        {t("role")}
                      </p>
                    )
                  }
                  none={
                    <p className="w-full text-xs font-normal text-muted-foreground">
                      {t("role")}
                    </p>
                  }
                />
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center overflow-clip rounded-md bg-muted">
                <UserRoundCog className="size-4.5 text-muted-foreground" />
              </span>
            </div>
            <div className="h-px w-full shrink-0 bg-border" />
            {/* The three figures were typed into this file as "4.9 / 47 / 32" while
                the catalogue — the record the public profile and every service card
                read — said 4.9, 124 consultations and 124 ratings. Two numbers for
                one advisor is one number too many, so these are the catalogue's. */}
            <div className="flex w-full shrink-0 items-start text-center">
              {[
                { value: ME?.rating ?? "—", label: t("statRating"), star: true },
                { value: ME?.consultations ?? 0, label: t("statBookings"), star: false },
                { value: ME?.reviews ?? 0, label: t("statReviews"), star: false },
              ].map((s) => (
                <div
                  className="flex min-w-px flex-1 flex-col items-center gap-0.5 overflow-clip"
                  key={s.label}
                >
                  <p className="font-latin flex w-full items-center justify-center gap-1 text-base font-medium tabular-nums text-foreground lg:text-lg">
                    {s.star ? (
                      <Star className="size-3.5 shrink-0 fill-primary text-primary" />
                    ) : null}
                    {s.value}
                  </p>
                  <p className="w-full text-xs font-normal text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </Surface>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-4">
          <QuickActions
            actions={[
              { icon: Briefcase, label: t("tileServices"), href: "/advisor/services" },
              { icon: CalendarDays, label: t("tileBookings"), href: "/work/calendar" },
              { icon: Wallet, label: t("tileEarnings"), href: "/work/earnings" },
              { icon: MessageSquare, label: t("tileChat"), href: "/chat" },
            ]}
          />
        </div>

        <SettingsSection label={t("sectionAdvisor")}>
          <SettingsCard>
            <SettingsRow
              href="/screening/requests"
              icon={FileText}
              label={t("requests")}
              value={<Badge className="size-5 p-0">3</Badge>}
            />
            <SettingsDivider />
            <SettingsRow href="/work/calendar" icon={CalendarDays} label={t("myBookings")} />
            <SettingsDivider />
            <SettingsRow href="/advisor/edit" icon={UserRoundCog} label={t("editAdvisor")} />
            <SettingsDivider />
            <SettingsRow href="/reviews" icon={Star} label={t("myReviews")} />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection label={t("sectionAccount")}>
          <SettingsCard>
            <SettingsRow href="/profile/edit" icon={UserRoundCog} label={t("editProfile")} />
            <SettingsDivider />
            <SettingsRow href="/settings" icon={Settings} label={t("accountSettings")} />
            <SettingsDivider />
            <SettingsRow href="/transactions" icon={CreditCard} label={t("paymentMethods")} />
            <SettingsDivider />
            <SettingsRow href="/earnings/payout-account" icon={Wallet} label={t("withdraw")} />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection>
          <SettingsCard>
            <SettingsRow icon={CircleHelp} label={t("helpCentre")} />
            <SettingsDivider />
            <SettingsRow href="/terms" icon={ShieldCheck} label={t("termsPrivacy")} />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection>
          <SettingsCard>
            <SettingsRow
              href="/settings/logout"
              icon={LogOut}
              iconClassName="text-destructive"
              label={t("logOut")}
              labelClassName="text-destructive"
              showChevron={false}
            />
          </SettingsCard>
        </SettingsSection>
      </ScreenBody>
      <BottomBar className="lg:hidden" role="advisor" selected="user" />
    </MobileScreen>
  );
}

/** Figma "Advisor profile - Edit (Light)" — 995:8722. */
export function AdvisorProfileEditScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/advisor/profile" label={c("back")} />
      <ScreenBody className="lg:[&>*:not(.sticky)]:mx-auto lg:[&>*:not(.sticky)]:w-full lg:[&>*:not(.sticky)]:max-w-[880px]">
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("editSubtitle")}
          title={t("editTitle")}
        />

        <div className="flex w-full shrink-0 flex-col items-center gap-3 px-6 pt-2">
          <Image
            alt=""
            className="size-24 shrink-0 rounded-full object-cover"
            height={96}
            src={advisor}
            width={96}
          />
          <NeutralButton className="w-auto">{t("changePhoto")}</NeutralButton>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-5">
          <Field
            defaultValue={t("name")}
            id="advisor-name"
            label={t("displayNameLabel")}
            latin
          />
          <div className="flex w-full shrink-0 flex-col items-start gap-1.5">
            <label
              className="w-full text-sm font-medium text-foreground"
              htmlFor="advisor-bio"
            >
              {t("bioLabel")}
            </label>
            <Textarea
              className="h-22 resize-none bg-muted px-3 text-sm shadow-none field-sizing-fixed"
              defaultValue={t("bioValue")}
              id="advisor-bio"
            />
          </div>
          <Link
            className={cn(
              surfaceClass({ tier: "raised", interactive: true }),
              "flex w-full items-center gap-3 p-3.5",
            )}
            href="/advisor/skills"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip text-left">
              <p className="w-full text-xs font-normal text-muted-foreground">
                {t("skillsLabel")}
              </p>
              <p className="w-full text-sm font-normal text-foreground">
                {t("skillsValue")}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/advisor/profile">{t("save")}</PrimaryButton>
          <NeutralButton href="/advisor/profile">{t("cancel")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}

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

/** Figma "Payout account - Setup (Light)" — 995:8874. */
export function PayoutSetupScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/earnings" label={c("back")} />
      <ScreenBody className="lg:[&>*:not(.sticky)]:mx-auto lg:[&>*:not(.sticky)]:w-full lg:[&>*:not(.sticky)]:max-w-[880px]">
        <ScreenHeading className="pt-4" title={t("payoutSetupTitle")} />
        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-2">
          <Field
            icon={Landmark}
            id="payout-bank"
            label={t("bankLabel")}
            placeholder={t("bankPlaceholder")}
            trailing={<ChevronsUpDown className="size-4" />}
          />
          <Field
            id="payout-number"
            label={t("accountNoLabel")}
            placeholder={t("accountNoPlaceholder")}
          />
          <Field
            id="payout-name"
            label={t("accountNameLabel")}
            placeholder={t("accountNamePlaceholder")}
          />
        </div>
        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <PrimaryButton href="/earnings/payout-account">{t("saveAccount")}</PrimaryButton>
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Payout account - Status (Light)" — 995:8909. */
export function PayoutAccountScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/earnings" label={c("back")} />
      <ScreenBody className="lg:[&>*:not(.sticky)]:mx-auto lg:[&>*:not(.sticky)]:w-full lg:[&>*:not(.sticky)]:max-w-[880px]">
        <ScreenHeading className="pt-4" title={t("payoutTitle")} />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <Surface className="flex w-full flex-col items-start gap-3 p-3.5 lg:p-4">
            <div className="flex w-full shrink-0 items-center gap-3">
              <Landmark className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
                <p className="w-full text-sm font-medium text-foreground">
                  {t("bankName")}
                </p>
                <p className="w-full font-latin text-xs font-normal tabular-nums text-muted-foreground">
                  {t("bankAccount")}
                </p>
              </div>
              {/* A verified account is a status, and this is the one status vocabulary
                  the product has — the badge was a hand-tinted `bg-primary/10`. */}
              <StatusPill icon={CircleCheck} tone="success">
                {t("verified")}
              </StatusPill>
            </div>
            <div className="h-px w-full shrink-0 bg-border" />
            <div className="flex h-5 w-full items-center gap-2.5">
              <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                {t("accountNameLabel")}
              </span>
              <span className="font-latin shrink-0 text-sm font-medium text-foreground">
                {t("accountNameValue")}
              </span>
            </div>
            <div className="flex h-5 w-full items-center gap-2.5">
              <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                {t("payoutTypeLabel")}
              </span>
              <span className="shrink-0 text-sm font-medium text-foreground">
                {t("payoutTypeValue")}
              </span>
            </div>
          </Surface>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <NeutralButton href="/earnings/payout-account/setup">{t("changeAccount")}</NeutralButton>
          <NeutralButton href="/earnings">{t("deleteAccount")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
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
