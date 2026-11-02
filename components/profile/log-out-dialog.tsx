"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { SETTINGS_DIALOG_ACTIONS, SettingsDialog, settingsPill } from "@/components/profile/settings-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/session";

/**
 * Figma "Log out confirm" (995:7665): the question and the two answers, in the
 * same dialog as the settings' other steps (`SettingsDialog`), so it opens,
 * closes and reads as they do. Leaving takes the soft red capsule: it ends
 * the session, though nothing is lost.
 *
 * The route *is* the dialog's open state; the prototype has no trigger to
 * press. Closing it, or answering no, goes back to `cancelHref` — except while
 * the sign-out is in flight, when both answers are held.
 *
 * `signOut` answers whether the API confirmed the session ended. Only then
 * does the page leave; otherwise the dialog stays with a line saying so, and
 * the same button tries again.
 */
export function LogOutDialog({ cancelHref = "/profile" }: { readonly cancelHref?: string }) {
  const t = useTranslations("logOut");
  const router = useRouter();
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit() {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setFailed(false);
    if (await signOut()) {
      // A full load rather than `router.replace`: the gate on this guarded
      // route reacts to the sign-out too, and its soft redirect would add a
      // `?next=` pointing back at this dialog.
      window.location.replace("/login");
      return;
    }
    pending.current = false;
    setSaving(false);
    setFailed(true);
  }

  return (
    <SettingsDialog
      description={t("body")}
      onOpenChange={(open) => {
        if (!open && !pending.current) router.push(cancelHref);
      }}
      open
      title={t("title")}
    >
      {failed ? (
        <p className="mb-3 text-xs text-destructive md:mb-4 md:text-sm" role="alert">
          {t("failure")}
        </p>
      ) : null}
      {/* Straight under the question: there is no form between, so the
          dialog's own gap is the only one (the actions' would add to it). */}
      <div className={cn(SETTINGS_DIALOG_ACTIONS, "mt-0 md:mt-0")}>
        <Button
          className={settingsPill("ghost")}
          disabled={saving}
          nativeButton={saving}
          render={saving ? undefined : <Link href={cancelHref} />}
          variant="ghost"
        >
          {t("cancel")}
        </Button>
        <Button className={settingsPill("danger")} disabled={saving} onClick={submit} type="button" variant="ghost">
          {saving ? t("pending") : t("confirm")}
        </Button>
      </div>
    </SettingsDialog>
  );
}
