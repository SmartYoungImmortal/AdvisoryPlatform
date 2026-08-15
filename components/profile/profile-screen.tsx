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

import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import {
  SettingsCard,
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from "@/components/mobile/settings-list";
import { IdentityCard } from "@/components/profile/identity-card";
import { QuickActions } from "@/components/profile/quick-actions";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";

/**
 * Figma "Advisee profile - View" (995:7191) and the profile behind the log-out
 * dialog (995:7665). The two frames differ in the identity subtitle, the middle
 * stat, the quick-action set and whether the "become an advisor" card is present.
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

  return (
    <MobileScreen>
      <ScreenBody className="pb-1.5">
        <TopBar unreadNotifications />
        <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-4">
          <IdentityCard
            editHref="/profile/edit"
            editLabel={t("editProfileAction")}
            name={t("name")}
            stats={[
              { value: "12", label: t("stats.sessions") },
              {
                value: "1",
                label: isView ? t("stats.bookings") : t("stats.upcoming"),
              },
              { value: "8", label: t("stats.reviews") },
            ]}
            subtitle={isView ? t("role") : t("roleWithMember")}
          />
        </div>

        <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-4">
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

        {isView ? (
          <SettingsSection>
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

        <SettingsSection label={t("accountLabel")}>
          <SettingsCard>
            <SettingsRow href="/profile/edit" icon={UserRoundCog} label={t("editProfile")} />
            <SettingsDivider />
            <SettingsRow href="/settings" icon={Settings} label={t("accountSettings")} />
            <SettingsDivider />
            <SettingsRow href="/transactions" icon={CreditCard} label={t("paymentMethods")} />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection label={t("supportLabel")}>
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
      <BottomBar role="anon" selected="user" />
      {overlay}
    </MobileScreen>
  );
}
