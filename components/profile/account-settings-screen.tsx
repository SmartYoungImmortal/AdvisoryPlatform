"use client";

import {
  Bell,
  ChevronLeft,
  CircleCheckBig,
  FileText,
  Globe,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";

import { AccountShell, DESKTOP_TYPE_LIFT } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { SuccessBanner } from "@/components/mobile/banner";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { GUTTER } from "@/components/notifications/notification-center-screen";
import { usePushToggle } from "@/components/notifications/push-toggle";
import { useOwnProfile } from "@/components/profile/profile-data";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAppLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

/** The settings' categories, in the order the menu lists them. */
const SECTIONS = ["account", "notifications", "language", "legal"] as const;
type SectionKey = (typeof SECTIONS)[number];

const SECTION = {
  account: { icon: UserRound, label: "sectionAccount" },
  notifications: { icon: Bell, label: "sectionNotifications" },
  language: { icon: Globe, label: "sectionLanguage" },
  legal: { icon: FileText, label: "sectionLegal" },
} as const satisfies Record<SectionKey, { readonly icon: LucideIcon; readonly label: string }>;

/**
 * A row's action: a soft grey capsule (a destructive one in the destructive
 * tint), a link to the page that does it.
 */
function RowAction({
  href,
  children,
  destructive = false,
}: {
  readonly href: string;
  readonly children: ReactNode;
  readonly destructive?: boolean;
}) {
  return (
    <Button
      className={cn(
        "h-9 shrink-0 rounded-full px-4 text-sm font-medium lg:h-11 lg:px-5 lg:text-frame-meta",
        destructive
          ? "bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive"
          : "bg-muted text-foreground hover:bg-muted/70 hover:text-foreground",
      )}
      nativeButton={false}
      render={href.startsWith("mailto:") ? <a href={href} /> : <Link href={href} />}
      variant="ghost"
    >
      {children}
    </Button>
  );
}

/**
 * One setting: its name, a short line under it when there is something to
 * add, and its control at the right edge, a hairline under every row.
 */
function SettingRow({
  label,
  labelId,
  detail,
  destructive = false,
  children,
}: {
  readonly label: ReactNode;
  readonly labelId?: string;
  readonly detail?: ReactNode;
  readonly destructive?: boolean;
  /** The control: an action capsule, a switch, the language choices. */
  readonly children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-4 border-b border-border py-4 lg:gap-8 lg:py-5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
        <span
          className={cn("text-sm font-medium lg:text-frame-body", destructive ? "text-destructive" : "text-foreground")}
          id={labelId}
        >
          {label}
        </span>
        {detail ? <span className="text-xs break-words text-muted-foreground lg:text-frame-meta">{detail}</span> : null}
      </div>
      {children}
    </li>
  );
}

/**
 * A category: its glyph on a soft grey tile and its name over a hairline,
 * then its rows. From `lg` only the chosen one shows, beside the menu; on a
 * phone or an upright tablet there is no menu, and every category is stacked.
 */
function SettingsSection({
  section,
  active,
  children,
}: {
  readonly section: SectionKey;
  readonly active: boolean;
  readonly children: ReactNode;
}) {
  const t = useTranslations("accountSettings");
  const heading = useId();
  const Icon = SECTION[section].icon;

  return (
    <section aria-labelledby={heading} className={cn("flex w-full flex-col", !active && "lg:hidden")}>
      <header className="flex items-center gap-3 border-b border-border pb-4 lg:gap-4 lg:pb-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground lg:size-12">
          <Icon aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
        </span>
        <h2 className="text-base font-medium text-foreground lg:text-frame-heading" id={heading}>
          {t(SECTION[section].label)}
        </h2>
      </header>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

/**
 * The categories as a menu down the left of the panel (from `lg`), the chosen
 * one on a soft grey ground, under the page title.
 */
function SettingsMenu({
  value,
  onChange,
}: {
  readonly value: SectionKey;
  readonly onChange: (next: SectionKey) => void;
}) {
  const t = useTranslations("accountSettings");

  return (
    // Flush to the panel's left edge, beside the rail, the full height of the
    // panel: the menu is what fills the left of the page, not a margin.
    <nav
      aria-label={t("menuLabel")}
      className="hidden lg:flex lg:flex-col lg:gap-6 lg:border-r lg:border-border lg:px-6 lg:pt-[47.5px] lg:pb-16"
    >
      <h1 className="font-hero text-frame-title font-normal tracking-tight text-hero-ink">{t("title")}</h1>
      <ul className="flex flex-col gap-1">
        {SECTIONS.map((key) => {
          const Icon = SECTION[key].icon;
          const current = key === value;
          return (
            <li key={key}>
              <Button
                aria-current={current ? "true" : undefined}
                className={cn(
                  // `lg:` so the step outranks the primitive's own `text-sm`; the menu is `lg` only.
                  "h-12 w-full justify-start gap-3 rounded-xl px-4 font-medium lg:text-frame-body",
                  current
                    ? "bg-muted text-foreground hover:bg-muted"
                    : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                )}
                onClick={() => onChange(key)}
                type="button"
                variant="ghost"
              >
                <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                {t(SECTION[key].label)}
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Device alerts, switched in place. The switch says what the browser reports,
 * not what was last pressed; a state that cannot be changed from here (a
 * blocked permission) disables it and says why on the row's second line.
 */
function PushRow() {
  const t = useTranslations("notifications");
  const label = useId();
  const { checked, disabled, onCheckedChange, note } = usePushToggle();

  return (
    <SettingRow
      detail={<span aria-live="polite" role="status">{note ?? t("primerSubtitle")}</span>}
      label={t("pushLabel")}
      labelId={label}
    >
      <Switch
        aria-labelledby={label}
        checked={checked}
        // The primitive's 32×18 read as a speck in a row this size, and smaller
        // still inside the zoomed panel. The track is twice the thumb less 2px
        // wide (plus its 1px borders), so the thumb's own `100% - 2px` slide
        // still lands it at the far edge.
        className="data-[size=default]:h-6.5 data-[size=default]:w-12 lg:data-[size=default]:h-7.5 lg:data-[size=default]:w-14 [&_[data-slot=switch-thumb]]:size-6! lg:[&_[data-slot=switch-thumb]]:size-7!"
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </SettingRow>
  );
}

/** The language, as two pressed-or-not choices on a muted track, switched in place. */
function LanguageRow() {
  const t = useTranslations("appRail");
  const s = useTranslations("accountSettings");
  const label = useId();
  const { locale, setLocale } = useAppLocale();
  const option = (value: "th" | "en", text: string) => (
    <Button
      aria-pressed={locale === value}
      className={cn(
        "h-8 rounded-full px-3.5 text-sm font-medium lg:h-10 lg:px-4 lg:text-frame-meta",
        value === "en" && "font-latin",
        locale === value
          ? "bg-card text-foreground shadow-hero-card hover:bg-card hover:text-foreground"
          : "text-muted-foreground hover:bg-transparent hover:text-foreground",
      )}
      onClick={() => setLocale(value)}
      type="button"
      variant="ghost"
    >
      {text}
    </Button>
  );

  return (
    <SettingRow detail={s("languageDetail")} label={t("language")} labelId={label}>
      {/* `<fieldset>`: a group by its own semantics; `border-0` keeps the capsule as it was. */}
      <fieldset aria-labelledby={label} className="flex shrink-0 items-center gap-1 rounded-full border-0 bg-muted p-1">
        {option("th", t("languageTh"))}
        {option("en", t("languageEn"))}
      </fieldset>
    </SettingRow>
  );
}

/**
 * Figma "Account settings" (995:7046) and its updated state (995:7095), which
 * adds a success banner and a verification note.
 *
 * From `lg` the panel is a menu of categories on the left and the chosen
 * category on the right: its tile and name over a hairline, then one row per
 * setting with its control at the right edge. On a phone or an upright tablet
 * the menu gives way to the back chevron and the title, and the categories
 * are stacked.
 *
 * Logging out opens the existing confirm (`/settings/logout`), which draws
 * this page under its dialog (`overlay`); deleting is last, in the
 * destructive tint, with what it removes on its second line.
 */
export function AccountSettingsScreen({
  state = "default",
  overlay,
}: {
  readonly state?: "default" | "updated";
  /** The log-out route renders this page under its dialog. */
  readonly overlay?: ReactNode;
}) {
  const t = useTranslations("accountSettings");
  const c = useTranslations("common");
  const nav = useTranslations("accountNav");
  const l = useTranslations("landing");
  const profile = useOwnProfile();
  const isUpdated = state === "updated";
  const [section, setSection] = useState<SectionKey>("account");

  return (
    // `wide="md"`: a tablet held upright gets the phone layout at its own width.
    <MobileScreen className="bg-card" wide="md">
      <AppFrame active="settings">
        <ScreenBody className="bg-card">
          {/* `compact`: the whole panel, edge to edge, so the menu can sit
              against its left edge; each side pads itself. */}
          <AccountShell active="settings" compact>
            <div
              className={cn(
                "flex w-full min-w-0 flex-col pt-6 pb-12 lg:grid lg:grow lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-stretch lg:p-0",
                GUTTER,
              )}
            >
              <SettingsMenu onChange={setSection} value={section} />

              {/* The phone's heading: the back chevron on a row of its own, then the title. */}
              <header className="flex w-full flex-col items-start gap-3 lg:hidden">
                <Button
                  aria-label={c("back")}
                  className="relative -ml-1.5 size-8 shrink-0 text-foreground before:absolute before:-inset-1.5 before:content-['']"
                  nativeButton={false}
                  render={<Link href="/profile" />}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronLeft aria-hidden className="size-6" />
                </Button>
                <h1 className="font-hero text-title-compact font-normal tracking-tight text-hero-ink">{t("title")}</h1>
              </header>

              {/* The page's own top inset from `lg` (the shell's 47.5px, which
                  `compact` drops), so the category's heading lines up with the
                  menu's title. */}
              <div className="mt-6 flex min-w-0 flex-col gap-10 lg:mt-0 lg:gap-0 lg:px-16 lg:pt-[47.5px] lg:pb-16">
                {isUpdated ? (
                  // The banner is a shared phone block; the lift sets its type on the frame's steps.
                  <div className={cn("lg:mb-8", DESKTOP_TYPE_LIFT)}>
                    <SuccessBanner
                      body={t("updatedBody")}
                      className="px-0 pt-0"
                      icon={CircleCheckBig}
                      title={t("updatedTitle")}
                    />
                  </div>
                ) : null}

                <SettingsSection active={section === "account"} section="account">
                  <SettingRow
                    // The account's own address, in the Latin face it is written in.
                    detail={profile.data?.email ? <span className="font-latin">{profile.data.email}</span> : null}
                    label={c("email")}
                  >
                    <RowAction href="/settings/email">{t("change")}</RowAction>
                  </SettingRow>
                  <SettingRow detail={isUpdated ? t("verifyNote") : null} label={t("password")}>
                    <RowAction href="/settings/password">{t("change")}</RowAction>
                  </SettingRow>
                  <SettingRow detail={t("helpDetail")} label={t("helpCenter")}>
                    <RowAction href={`mailto:${l("footerEmailAddress")}`}>{t("contact")}</RowAction>
                  </SettingRow>
                  {/* Opens the confirm rather than signing out on one press. */}
                  <SettingRow detail={t("logOutDetail")} label={nav("logOut")}>
                    <RowAction href="/settings/logout">{nav("logOut")}</RowAction>
                  </SettingRow>
                  <SettingRow destructive detail={t("deleteNote")} label={t("deleteAccount")}>
                    <RowAction destructive href="/settings/delete">
                      {t("deleteAction")}
                    </RowAction>
                  </SettingRow>
                </SettingsSection>

                <SettingsSection active={section === "notifications"} section="notifications">
                  <PushRow />
                </SettingsSection>

                <SettingsSection active={section === "language"} section="language">
                  <LanguageRow />
                </SettingsSection>

                <SettingsSection active={section === "legal"} section="legal">
                  <SettingRow label={c("termsOfService")}>
                    <RowAction href="/terms">{t("read")}</RowAction>
                  </SettingRow>
                  <SettingRow label={c("privacy")}>
                    <RowAction href="/privacy-policy">{t("read")}</RowAction>
                  </SettingRow>
                </SettingsSection>
              </div>
            </div>
          </AccountShell>
        </ScreenBody>
      </AppFrame>
      {overlay}
    </MobileScreen>
  );
}
