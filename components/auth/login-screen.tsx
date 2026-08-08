import Link from "next/link";
import { Eye, Lock, Mail, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { BrandLockup } from "@/components/auth/brand-lockup";
import { AlertBanner } from "@/components/mobile/banner";
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
import { StatusBar } from "@/components/mobile/status-bar";

/**
 * Figma "Login (Light)" (995:4174) plus the account-locked (995:4207) and
 * wrong-password (995:4246) states, which slot an alert banner under the heading.
 */
export function LoginScreen({
  state = "default",
}: {
  readonly state?: "default" | "account-locked" | "wrong-password";
}) {
  const t = useTranslations("login");
  const e = useTranslations("loginErrors");
  const c = useTranslations("common");
  const locked = state === "account-locked";
  const wrong = state === "wrong-password";
  const filled = locked || wrong;

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/" label={c("back")} />
      <ScreenBody>
        <BrandLockup />
        {/* Figma "Heading": 24px top / 8px bottom padding and a 6px gap. */}
        <ScreenHeading
          className="gap-1.5 pt-6"
          subtitle={t("subtitle")}
          title={t("title")}
        />

        {locked ? (
          <AlertBanner body={e("lockedBody")} icon={Lock} title={e("lockedTitle")} />
        ) : null}
        {wrong ? (
          <AlertBanner
            body={e("wrongBody")}
            icon={TriangleAlert}
            title={e("wrongTitle")}
          />
        ) : null}

        {/* Figma "Form Fields": 16px top padding, 16px between rows. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 overflow-clip px-6 pt-4">
          <Field
            defaultValue={filled ? "araya.s@kmitl.ac.th" : undefined}
            icon={Mail}
            id="login-email"
            label={t("emailLabel")}
            latin
            placeholder={t("emailPlaceholder")}
            type="email"
          />
          <Field
            defaultValue={filled ? "password" : undefined}
            icon={Lock}
            id="login-password"
            label={t("passwordLabel")}
            placeholder={t("passwordPlaceholder")}
            trailing={
              <button aria-label={t("showPassword")} type="button">
                <Eye className="size-4" />
              </button>
            }
            type="password"
          />
          {/* Figma "Forgot Password Row": right-aligned 32px link target. */}
          <div className="flex w-full shrink-0 items-center justify-end overflow-clip">
            <Link
              className="font-thai flex min-h-8 shrink-0 items-center justify-center gap-2 rounded-[8px] px-3 py-[6px] text-[14px] leading-[20px] font-medium whitespace-nowrap text-primary"
              href="/forgot-password"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        </div>

        <ScreenSpacer />
        {/* Figma "Actions": 24px top / 32px bottom padding, 12px gap. */}
        <ScreenActions className="pt-6 pb-8">
          <PrimaryButton className="disabled:opacity-40" href={locked ? undefined : "/profile"}>
            {t("signIn")}
          </PrimaryButton>
          <NeutralButton href="/register">{t("signUp")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
