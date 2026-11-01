"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { signOut } from "@/lib/session";

/** Logout confirmation follows the current phone and desktop Figma dialog frames. */
export function LogOutDialog({
  cancelHref = "/profile",
}: {
  readonly cancelHref?: string;
}) {
  const t = useTranslations("logOut");
  const router = useRouter();
  const popup = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit() {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setFailed(false);
    const confirmed = await signOut();
    if (confirmed) {
      // Finish the cookie request before navigating away from this guarded route.
      window.location.replace("/login");
      return;
    }
    pending.current = false;
    setSaving(false);
    setFailed(true);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending.current) router.push(cancelHref);
      }}
    >
      <DialogContent
        className="flex w-[calc(100%-3rem)] max-w-[20.375rem] flex-col gap-0 rounded-2xl p-5 text-start sm:max-w-[26.25rem] md:p-7"
        initialFocus={(type) => (type === "keyboard" ? true : popup.current)}
        overlayClassName="bg-scrim/60 supports-backdrop-filter:backdrop-blur-none"
        ref={popup}
        showCloseButton={false}
      >
        <DialogTitle className="text-xl leading-7 font-semibold">
          {t("title")}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-5 text-muted-foreground">
          {t("body")}
        </DialogDescription>
        {failed ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {t("failure")}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2.5 md:h-[5.125rem] md:flex-row md:items-center md:justify-end md:gap-3">
          <Button
            className="h-9 w-full rounded-lg bg-destructive text-sm text-primary-foreground hover:bg-destructive/90 md:w-40"
            disabled={saving}
            onClick={submit}
            type="button"
            variant="destructive"
          >
            {saving ? t("pending") : t("confirm")}
          </Button>
          <Button
            className="h-9 w-full rounded-lg bg-card text-sm md:order-first md:w-30"
            disabled={saving}
            nativeButton={saving}
            render={saving ? undefined : <Link href={cancelHref} />}
            variant="outline"
          >
            {t("cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
