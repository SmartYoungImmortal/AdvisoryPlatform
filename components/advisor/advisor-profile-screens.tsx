import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import { HomeIndicator } from "@/components/mobile/home-indicator";
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
import { StatusBar } from "@/components/mobile/status-bar";
import { QuickActions } from "@/components/profile/quick-actions";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";

/** Figma "Advisor profile - View (Light)" — 995:8633. */
export function AdvisorProfileScreen() {
  const t = useTranslations("advisor");

  return (
    <MobileScreen>
      <StatusBar />
      <TopBar unreadNotifications />
      <ScreenBody className="pb-1.5">
        {/* Figma "Identity Card": verified name, role, then rating/booking/review stats. */}
        <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-4">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5">
            <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
              <Image
                alt=""
                className="size-14 shrink-0 rounded-full object-cover"
                height={56}
                src={advisor}
                width={56}
              />
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                <p className="font-latin flex w-full items-center gap-1 text-base font-medium text-foreground">
                  {t("name")}
                  <BadgeCheck className="size-4 shrink-0 text-primary" />
                </p>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("role")}
                </p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center overflow-clip rounded-md bg-muted">
                <UserRoundCog className="size-4.5 text-muted-foreground" />
              </span>
            </div>
            <div className="h-px w-full shrink-0 bg-muted" />
            <div className="flex w-full shrink-0 items-start overflow-clip text-center">
              {[
                { value: "4.9", label: t("statRating"), star: true },
                { value: "47", label: t("statBookings"), star: false },
                { value: "32", label: t("statReviews"), star: false },
              ].map((s) => (
                <div
                  className="flex min-w-px flex-1 flex-col items-center gap-0.5 overflow-clip"
                  key={s.label}
                >
                  <p className="font-latin flex w-full items-center justify-center gap-1 text-base font-medium text-foreground">
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
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-4">
          <QuickActions
            actions={[
              { icon: FileText, label: t("tileServices"), href: "/screening/requests" },
              { icon: CalendarDays, label: t("tileBookings") },
              { icon: Wallet, label: t("tileEarnings"), href: "/earnings" },
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
            <SettingsRow icon={CalendarDays} label={t("myBookings")} />
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
      <BottomBar role="advisor" selected="user" />
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Advisor profile - Edit (Light)" — 995:8722. */
export function AdvisorProfileEditScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/advisor/profile" label={c("back")} />
      <ScreenBody>
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
            className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip rounded-xl bg-card p-3.5"
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
            <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/advisor/profile">{t("save")}</PrimaryButton>
          <NeutralButton href="/advisor/profile">{t("cancel")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Skill management (Light)" — 995:8768. */
export function SkillManagementScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  const toneClass: Record<"muted" | "primary" | "destructive", string> = {
    muted: "text-muted-foreground",
    primary: "text-primary",
    destructive: "text-destructive",
  };

  const skills = [
    { name: t("skill1"), meta: t("skill1Meta"), tone: "muted" as const },
    { name: t("skill2"), meta: t("skill2Meta"), tone: "muted" as const },
    { name: t("skill3"), meta: t("skill3Meta"), tone: "primary" as const },
    { name: t("skill4"), meta: t("skill4Meta"), tone: "destructive" as const },
  ];

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/advisor/edit" label={c("back")} />
      <ScreenBody>
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("skillsSubtitle")}
          title={t("skillsTitle")}
        />

        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("yourSkills")}
          </p>
          <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card">
            {skills.map((s, i) => (
              <div className="w-full" key={s.name}>
                {i > 0 ? <div className="h-px w-full shrink-0 bg-muted" /> : null}
                <div className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip p-3.5">
                  <FileText className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                    <p className="w-full text-sm font-medium text-foreground">
                      {s.name}
                    </p>
                    <p
                      className={`w-full text-xs font-normal ${toneClass[s.tone]}`}
                    >
                      {s.meta}
                    </p>
                  </div>
                  <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
                </div>
              </div>
            ))}
            <div className="h-px w-full shrink-0 bg-muted" />
            <AddRow label={t("addSkill")} />
          </div>
        </div>

        <ScreenSpacer />
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Payout account - Setup (Light)" — 995:8874. */
export function PayoutSetupScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/earnings" label={c("back")} />
      <ScreenBody>
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
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Payout account - Status (Light)" — 995:8909. */
export function PayoutAccountScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/earnings" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="pt-4" title={t("payoutTitle")} />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5">
            <div className="flex w-full shrink-0 items-center gap-3">
              <Landmark className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
                <p className="w-full text-sm font-medium text-foreground">
                  {t("bankName")}
                </p>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("bankAccount")}
                </p>
              </div>
              <Badge className="h-auto bg-primary/10 py-0.75 text-primary">
                <CircleCheck />
                {t("verified")}
              </Badge>
            </div>
            <div className="h-px w-full shrink-0 bg-muted" />
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
          </div>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <NeutralButton href="/earnings/payout-account/setup">{t("changeAccount")}</NeutralButton>
          <NeutralButton href="/earnings">{t("deleteAccount")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Payout detail - Failed (Light)" — 995:8950. */
export function PayoutFailedScreen() {
  const t = useTranslations("advisor");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/earnings/payout-history" label={c("back")} />
      <ScreenBody>
        <div className="flex w-full shrink-0 flex-col items-center px-6 pt-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <CircleAlert className="size-5 text-destructive" />
          </span>
          <p className="font-latin mt-3 w-full text-center text-heading font-semibold text-foreground">
            {t("payoutFailedAmount")}
          </p>
          <p className="mt-1 w-full text-center text-xs font-normal text-muted-foreground">
            {t("payoutFailedWhen")}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
          <div className="flex w-full shrink-0 items-start gap-3 overflow-clip rounded-xl bg-card p-3.5">
            <Clock className="size-4 shrink-0 text-primary" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full text-sm font-medium text-foreground">
                {t("fundsSafeTitle")}
              </p>
              <p className="w-full text-xs font-normal text-muted-foreground">
                {t("fundsSafeBody")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5">
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
                  className={`font-latin shrink-0 text-sm font-medium whitespace-nowrap ${tone || "text-foreground"}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/earnings/payout-account/setup">{t("fixDetails")}</PrimaryButton>
          <NeutralButton href="/earnings">{t("contactSupport")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
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
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/earnings" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="pt-4" title={t("historyTitle")} />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <div className="flex w-full shrink-0 flex-col items-start gap-1 overflow-clip rounded-xl bg-card p-3.5">
            <p className="w-full text-xs font-normal text-muted-foreground">
              {t("historyYearLabel")}
            </p>
            <p className="font-latin w-full text-heading font-semibold text-foreground">
              {t("historyTotal")}
            </p>
            <p className="w-full text-xs font-normal text-muted-foreground">
              {t("historyNote")}
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("allTransfers")}
          </p>
          <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card">
            {rows.map((r, i) => (
              <div className="w-full" key={r.date}>
                {i > 0 ? <div className="h-px w-full shrink-0 bg-muted" /> : null}
                <Link
                  className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip p-3.5"
                  href="/earnings/payout-history/failed"
                >
                  <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                    <p className="w-full text-sm font-medium text-foreground">
                      {r.date}
                    </p>
                    <p className="w-full text-xs font-normal text-muted-foreground">
                      {r.meta}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <p className="font-latin text-sm font-medium whitespace-nowrap text-foreground">
                      {r.amount}
                    </p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {t("success")}
                    </p>
                  </div>
                  <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        <ScreenSpacer />
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Advisor - Earnings (Light)" — 995:8682. */
export function EarningsScreen() {
  const t = useTranslations("advisor");

  return (
    <MobileScreen>
      <StatusBar />
      <TopBar unreadNotifications />
      <ScreenBody className="pb-1.5">
        <ScreenHeading className="pt-4" title={t("earningsTitle")} />

        {/* Figma balance card: available balance with the withdraw CTA. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-xl bg-card p-3.5">
            <p className="w-full text-xs font-normal text-muted-foreground">
              {t("available")}
            </p>
            <p className="font-latin w-full text-heading font-semibold text-foreground">
              {t("availableAmount")}
            </p>
            <PrimaryButton href="/earnings/payout-account">{t("withdrawCta")}</PrimaryButton>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card">
            {[
              { icon: Clock, title: t("inTransit"), meta: t("inTransitMeta"), amount: t("inTransitAmount") },
              { icon: CircleAlert, title: t("pending"), meta: t("pendingMeta"), amount: t("pendingAmount") },
              { icon: Wallet, title: t("withdrawn"), meta: t("withdrawnMeta"), amount: t("withdrawnAmount") },
            ].map(({ icon: Icon, title, meta, amount }, i) => (
              <div className="w-full" key={title}>
                {i > 0 ? <div className="h-px w-full shrink-0 bg-muted" /> : null}
                <div className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip p-3.5">
                  <Icon className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                    <p className="w-full text-sm font-medium text-foreground">
                      {title}
                    </p>
                    <p className="w-full text-xs font-normal text-muted-foreground">
                      {meta}
                    </p>
                  </div>
                  <p className="font-latin mt-2.5 shrink-0 text-sm font-medium whitespace-nowrap text-foreground">
                    {amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Figma "การให้คำปรึกษาล่าสุด": recent sessions with payout status. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <div className="flex w-full items-center justify-between gap-3">
            <p className="text-xs font-normal text-muted-foreground">
              {t("recentSessions")}
            </p>
            <span className="text-xs font-medium text-primary">
              {t("seeAll")}
            </span>
          </div>
          <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card">
            {[
              { avatar: advisor, name: t("e1Name"), meta: t("e1Meta"), amount: t("e1Amount"), status: t("pending") },
              { avatar: advisor, name: t("e2Name"), meta: t("e2Meta"), amount: t("e2Amount"), status: t("available") },
            ].map((r, i) => (
              <div className="w-full" key={r.name}>
                {i > 0 ? <div className="h-px w-full shrink-0 bg-muted" /> : null}
                <div className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip p-3.5">
                  <Image
                    alt=""
                    className="mt-1 size-8 shrink-0 rounded-full object-cover"
                    height={32}
                    src={r.avatar}
                    width={32}
                  />
                  <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                    <p className="w-full text-sm font-medium text-foreground">
                      {r.name}
                    </p>
                    <p className="w-full text-xs font-normal text-muted-foreground">
                      {r.meta}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <p className="font-latin text-sm font-medium whitespace-nowrap text-foreground">
                      {r.amount}
                    </p>
                    <p className="text-xs font-normal whitespace-nowrap text-muted-foreground">
                      {r.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SettingsSection>
          <SettingsCard>
            <SettingsRow
              href="/earnings/payout-account"
              icon={Landmark}
              label={t("payoutAccountRow")}
              value={t("payoutAccountRowValue")}
            />
            <SettingsDivider />
            <SettingsRow
              href="/earnings/payout-history"
              icon={FileText}
              label={t("payoutHistoryRow")}
            />
          </SettingsCard>
        </SettingsSection>
      </ScreenBody>
      <BottomBar role="advisor" selected="earnings" />
      <HomeIndicator />
    </MobileScreen>
  );
}
