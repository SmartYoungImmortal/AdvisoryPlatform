"use client";

import { CircleCheck, Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AlertBanner, InfoRow } from "@/components/mobile/banner";
import { Field } from "@/components/mobile/field";
import { AccountSettingsScreen } from "@/components/profile/account-settings-screen";
import {
  SETTINGS_DIALOG_ACTIONS,
  SettingsDialog,
  SettingsDialogList,
  settingsPill,
} from "@/components/profile/settings-dialog";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/lib/api/account";
import { ApiError } from "@/lib/api/client";

/**
 * Figma "Change password" (995:7360) and its wrong-current-password state
 * (995:7404), which adds an alert banner and an inline field error.
 *
 * A dialog over the settings (`SettingsDialog`) rather than a page of its own:
 * three fields and the rules they answer to, which the reader checks against
 * as they type, then the change. A wrong current password stays in the
 * dialog, under its field; a success goes to `/settings/updated`.
 */
function ChangePasswordForm({ state = "default" }: { readonly state?: "default" | "wrong-current" }) {
  const t = useTranslations("changePassword");
  const c = useTranslations("common");
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [problem, setProblem] = useState<"wrong-current" | "invalid" | null>(
    state === "wrong-current" ? "wrong-current" : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const isWrong = problem === "wrong-current";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      newPassword.length < 8 ||
      newPassword.length > 64 ||
      !/[^A-Za-z0-9]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      newPassword === currentPassword ||
      newPassword !== confirmPassword
    ) {
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
    <SettingsDialog title={t("title")}>
      <form className="flex w-full flex-col" onSubmit={submit}>
        {isWrong ? (
          <AlertBanner
            body={t("wrongCurrentBody")}
            className="mb-4 px-0 pt-0"
            icon={Lock}
            title={t("wrongCurrentTitle")}
          />
        ) : null}

        <div className="flex w-full flex-col gap-4">
          <Field
            error={isWrong ? t("wrongCurrentFieldError") : undefined}
            id="current-password"
            invalid={isWrong}
            label={t("currentLabel")}
            outline
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setProblem(null);
            }}
            placeholder={t("currentPlaceholder")}
            type="password"
            value={currentPassword}
          />
          <Field
            id="new-password"
            label={t("newLabel")}
            outline
            onChange={(event) => {
              setNewPassword(event.target.value);
              setProblem(null);
            }}
            placeholder={t("newPlaceholder")}
            type="password"
            value={newPassword}
          />
          <Field
            id="confirm-password"
            label={t("confirmLabel")}
            outline
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setProblem(null);
            }}
            placeholder={t("confirmPlaceholder")}
            type="password"
            value={confirmPassword}
          />
        </div>

        <SettingsDialogList caption={t("requirementsTitle")} className="mt-5">
          <InfoRow icon={CircleCheck}>{t("requirement1")}</InfoRow>
          <InfoRow icon={CircleCheck}>{isWrong ? t("requirement2Short") : t("requirement2")}</InfoRow>
          <InfoRow icon={CircleCheck}>{t("requirement3")}</InfoRow>
          <InfoRow icon={CircleCheck}>{t("requirement4")}</InfoRow>
        </SettingsDialogList>

        {problem === "invalid" ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {t("invalid")}
          </p>
        ) : null}

        <div className={SETTINGS_DIALOG_ACTIONS}>
          <Button className={settingsPill("solid")} disabled={submitting} type="submit">
            {t("submit")}
          </Button>
          <Button className={settingsPill()} nativeButton={false} render={<Link href="/settings" />} variant="outline">
            {c("cancel")}
          </Button>
        </div>
      </form>
    </SettingsDialog>
  );
}

/** `/settings/password`: the settings, with the change-password dialog over them. */
export function ChangePasswordScreen({ state = "default" }: { readonly state?: "default" | "wrong-current" }) {
  return <AccountSettingsScreen overlay={<ChangePasswordForm state={state} />} />;
}
