"use client";

import { CircleCheck, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AppFrame } from "@/components/account/app-frame";
import { AlertBanner, InfoCard, InfoRow } from "@/components/mobile/banner";
import { PrimaryButton } from "@/components/mobile/buttons";
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
  ACCOUNT_FORM_PANEL,
  ACCOUNT_HEADING,
  AccountBackBar,
} from "@/components/profile/account-chrome";
import { changePassword } from "@/lib/api/account";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Figma "Change password" (995:7360) and its wrong-current-password state
 * (995:7404), which adds an alert banner and an inline field error.
 *
 * Figma "Desktop / Change password (Light)" (1787:25493) and its wrong-current
 * state (1787:25583) put the same form in an 800px panel and stand the rules
 * beside the fields instead of under them, so the reader can check what they
 * are typing against them as they type.
 */
export function ChangePasswordScreen({
  state = "default",
}: {
  readonly state?: "default" | "wrong-current";
}) {
  const t = useTranslations("changePassword");
  const c = useTranslations("common");
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [problem, setProblem] = useState<"wrong-current" | "invalid" | null>(state === "wrong-current" ? "wrong-current" : null);
  const [submitting, setSubmitting] = useState(false);
  const isWrong = problem === "wrong-current";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8 || newPassword.length > 64 || !/[^A-Za-z0-9]/.test(newPassword) || !/\d/.test(newPassword) || newPassword === currentPassword || newPassword !== confirmPassword) {
      setProblem("invalid");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      router.push("/settings/updated");
    } catch (error) {
      setProblem(error instanceof ApiError && error.status === 400 ? "wrong-current" : "invalid");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileScreen wide="md">
      <ScreenTopBar className="lg:hidden" href="/settings" label={c("back")} />
      <AppFrame active="settings">
      <ScreenBody>
        <AccountBackBar href="/settings" label={c("back")} />

        {/* Figma "Head Band" — the title on the card surface, above the page. */}
        <div className="w-full shrink-0 lg:bg-card">
          <ScreenHeading className={ACCOUNT_HEADING} title={t("title")} />
        </div>

        {/* Figma "Form Band" — the panel the whole form moves into at 1440. */}
        <form onSubmit={submit} className={cn("flex w-full flex-1 flex-col items-center", ACCOUNT_FORM_PANEL)}>
          {isWrong ? (
            <AlertBanner
              body={t("wrongCurrentBody")}
              className="lg:px-0 lg:pt-0"
              icon={Lock}
              title={t("wrongCurrentTitle")}
            />
          ) : null}

          <div
            className={cn(
              "flex w-full shrink-0 flex-col items-start lg:grid lg:grid-cols-2 lg:items-start lg:gap-8",
              isWrong && "lg:pt-6",
            )}
          >
            {/* Figma "Form Fields": 16px top padding, 16px between fields. */}
            <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-4 lg:px-0 lg:pt-0">
              <Field
                value={currentPassword}
                onChange={(event) => { setCurrentPassword(event.target.value); setProblem(null); }}
                error={isWrong ? t("wrongCurrentFieldError") : undefined}
                id="current-password"
                invalid={isWrong}
                label={t("currentLabel")}
                placeholder={t("currentPlaceholder")}
                type="password"
              />
              <Field
                id="new-password"
                value={newPassword}
                onChange={(event) => { setNewPassword(event.target.value); setProblem(null); }}
                label={t("newLabel")}
                placeholder={t("newPlaceholder")}
                type="password"
              />
              <Field
                id="confirm-password"
                value={confirmPassword}
                onChange={(event) => { setConfirmPassword(event.target.value); setProblem(null); }}
                label={t("confirmLabel")}
                placeholder={t("confirmPlaceholder")}
                type="password"
              />
            </div>

            {/* Figma "Requirements": card with a 12/18 caption and 14/20 check rows. */}
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-4 lg:px-0 lg:pt-0">
              {/* The card is the page surface on the phone; on the panel it
                  would vanish into it, so it takes the muted tint there. */}
              <InfoCard caption={t("requirementsTitle")} className="lg:bg-muted/50">
                <InfoRow icon={CircleCheck}>{t("requirement1")}</InfoRow>
                <InfoRow icon={CircleCheck}>
                  {isWrong ? t("requirement2Short") : t("requirement2")}
                </InfoRow>
                <InfoRow icon={CircleCheck}>{t("requirement3")}</InfoRow>
                <InfoRow icon={CircleCheck}>{t("requirement4")}</InfoRow>
              </InfoCard>
            </div>
          </div>

          {/* The phone frame pins the action to the bottom edge; on the panel it
              sits under the two columns, held to the right. */}
          <ScreenSpacer className="lg:hidden" />
          {problem === "invalid" ? <p role="alert" className="px-6 pt-3 text-sm text-destructive">ตรวจสอบรหัสผ่านใหม่และการยืนยันอีกครั้ง</p> : null}
          <ScreenActions className="lg:flex-row-reverse lg:justify-start lg:px-0 lg:pt-8 lg:pb-0">
            <PrimaryButton className="lg:w-auto" disabled={submitting} type="submit">
              {t("submit")}
            </PrimaryButton>
          </ScreenActions>
        </form>
      </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}
