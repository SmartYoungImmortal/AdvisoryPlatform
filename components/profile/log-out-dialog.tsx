"use client";

import Link from "next/link";
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
 * press. Closing it, or answering no, goes back to `cancelHref`.
 */
export function LogOutDialog({ cancelHref = "/profile" }: { readonly cancelHref?: string }) {
  const t = useTranslations("logOut");

  return (
    <SettingsDialog closeHref={cancelHref} description={t("body")} title={t("title")}>
      {/* Straight under the question: there is no form between. */}
      <div className={cn(SETTINGS_DIALOG_ACTIONS, "mt-0")}>
        <Button className={settingsPill("ghost")} nativeButton={false} render={<Link href={cancelHref} />} variant="ghost">
          {t("cancel")}
        </Button>
        <Button
          className={settingsPill("danger")}
          onClick={() => {
            // A full load rather than `router.replace`: the gate on this guarded
            // route reacts to the sign-out too, and its soft redirect would add a
            // `?next=` pointing back at this dialog. After the API has dropped
            // the cookie, not before: leaving cancels the request that drops it.
            void signOut().then(() => window.location.replace("/login"));
          }}
          type="button"
          variant="ghost"
        >
          {t("confirm")}
        </Button>
      </div>
    </SettingsDialog>
  );
}
