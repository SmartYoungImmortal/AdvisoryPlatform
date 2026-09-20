"use client";

import {
  Bell,
  Briefcase,
  CalendarDays,
  CircleHelp,
  CreditCard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserRoundCog,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import {
  SettingsCard,
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from "@/components/mobile/settings-list";
import { IdentityCard } from "@/components/profile/identity-card";
import { OwnAvatar, hasRole, useOwnProfile } from "@/components/profile/profile-data";
import { AccountName, AccountStat } from "@/components/session/account-bits";
import { QuickActions } from "@/components/profile/quick-actions";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";

/**
 * Figma "Advisee profile - View" (995:7191) and the profile behind the log-out
 * dialog (995:7665). The two frames differ in the identity subtitle, the middle
 * stat, the quick-action set and whether the "become an advisor" card is present.
 *
 * Figma "Desktop / Advisee profile - View (Light)" (1787:25190) and
 * "Desktop / Log out confirm (Light)" (1787:26130) keep every part of the phone
 * frame and re-seat it: the column that stacks identity, tiles and settings
 * splits into a 384px aside beside a 787px settings column on the 1200 grid,
 * the tab bar goes — the desktop nav already carries those destinations — and
 * the page closes on the site footer.
 *
 * ## What the API fills, and what it does not
 *
 * `GET /users/me` gives the display name, the roles and the avatar key, so the
 * identity card's name, its subtitle and its portrait are real. The subtitle
 * reads `roles` case-insensitively: this route answers `["ADVISEE"]` in upper
 * case while better-auth answers `role: "advisee"` in lower, and a `===` would be
 * right on one and wrong on the other.
 *
 * **The three stats are not real, and there is no route that would make them so.**
 * Nothing in the API counts an account's sessions, bookings or reviews.
 * `GET /bookings/me` would give a page of bookings to count, and `total` on it is
 * a number this card could show — but the advisee bookings surface is owned
 * elsewhere, so they stay on the session fixture they were already reading rather
 * than being invented a second time here. Naming the gap is the point.
 */
export function ProfileScreen({
  variant = "view",
  overlay,
}: {
  readonly variant?: "view" | "logout";
  readonly overlay?: ReactNode;
}) {
  const t = useTranslations("profile");
  const isView = variant === "view";
  const profile = useOwnProfile();
  // The settings column runs flush with the top of the aside, so only the
  // sections after the first keep Figma's 32px rhythm between them.
  const section = "lg:px-0 lg:pt-8";
  const firstSection = "lg:px-0 lg:pt-0";
  const offersAdvisor = isView && !hasRole(profile.data, "advisor");

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="pb-19.5 lg:pb-0">
        <TopBar unreadNotifications />
        {/* Figma "Body" (1787:25213) — the phone's single column becomes two:
            everything that identifies the reader on the left, everything they
            can go and do on the right. */}
        <div className="flex w-full shrink-0 flex-col items-start lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-[384px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-8 xl:px-12 lg:pt-11 lg:pb-24">
          {/* The aside: who the reader is, and the three places they go most. */}
          <div className="flex w-full shrink-0 flex-col items-start">
            <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-4 lg:px-0 lg:pt-0">
              <IdentityCard
                avatar={<OwnAvatar className="size-14" size={56} />}
                editHref="/profile/edit"
                editLabel={t("editProfileAction")}
                /* The API's display name once it lands; until then the session's,
                   and the frame's fixture for a visitor with neither. */
                name={profile.data?.displayName ?? <AccountName fallback={t("name")} />}
                stats={[
                  {
                    value: <AccountStat fallback="12" stat="sessions" />,
                    label: t("stats.sessions"),
                  },
                  {
                    value: <AccountStat fallback="1" stat="bookings" />,
                    label: isView ? t("stats.bookings") : t("stats.upcoming"),
                  },
                  {
                    value: <AccountStat fallback="8" stat="reviews" />,
                    label: t("stats.reviews"),
                  },
                ]}
                subtitle={isView ? t("role") : t("roleWithMember")}
              />
            </div>

            <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-4 lg:px-0 lg:pt-3">
              <QuickActions
                actions={
                  isView
                    ? [
                        { icon: CalendarDays, label: t("tiles.bookings") },
                        { icon: MessageSquare, label: t("tiles.chat"), href: "/chat" },
                        { icon: Wallet, label: t("tiles.payments"), href: "/transactions" },
                      ]
                    : [
                        { icon: CalendarDays, label: t("tiles.bookings") },
                        { icon: MessageSquare, label: t("tiles.messages"), href: "/chat" },
                        { icon: Wallet, label: t("tiles.payments"), href: "/transactions" },
                        { icon: Bell, label: t("tiles.alerts"), href: "/notifications" },
                      ]
                }
              />
            </div>
          </div>

          {/* The settings column. On the phone these rows follow the tiles; at
              1440 they hold the right-hand 787 of the grid. */}
          <div className="flex w-full shrink-0 flex-col items-start">
            {/* This row offers the advisor *application*, which is the wrong
                offer for somebody already through it. `roles` says which, so once
                it has landed an account holding ADVISOR does not see it. Before
                it lands the frame's own answer stands. */}
            {offersAdvisor ? (
              <SettingsSection className={firstSection}>
                <SettingsCard>
                  <SettingsRow
                    href="/advisor/apply"
                    icon={Briefcase}
                    iconClassName="text-primary"
                    label={t("becomeAdvisor")}
                  />
                </SettingsCard>
              </SettingsSection>
            ) : null}

            <SettingsSection
              className={offersAdvisor ? section : firstSection}
              label={t("accountLabel")}
            >
              <SettingsCard>
                <SettingsRow href="/profile/edit" icon={UserRoundCog} label={t("editProfile")} />
                <SettingsDivider />
                <SettingsRow href="/settings" icon={Settings} label={t("accountSettings")} />
                <SettingsDivider />
                <SettingsRow
                  href="/transactions"
                  icon={CreditCard}
                  label={t("paymentMethods")}
                />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection className={section} label={t("supportLabel")}>
              <SettingsCard>
                <SettingsRow icon={CircleHelp} label={t("helpCentre")} />
                <SettingsDivider />
                <SettingsRow href="/terms" icon={ShieldCheck} label={t("termsPrivacy")} />
              </SettingsCard>
            </SettingsSection>

            <SettingsSection className={section}>
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
          </div>
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
      {/* Figma's desktop nav carries these destinations itself — see `TopBar`. */}
      <BottomBar className="lg:hidden" role="user" selected="user" />
      {overlay}
    </MobileScreen>
  );
}
