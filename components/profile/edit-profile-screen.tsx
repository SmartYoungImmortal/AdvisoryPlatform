"use client";

import { useRouter } from "next/navigation";
import { BellOff, Lock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { AlertBanner } from "@/components/mobile/banner";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
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
  ACCOUNT_NAV,
  AccountBackBar,
} from "@/components/profile/account-chrome";
import {
  AVATAR_ACCEPT,
  OwnAvatar,
  uploadOwnAvatar,
  useOwnProfile,
} from "@/components/profile/profile-data";
import { Input } from "@/components/ui/input";
import { TopBar } from "@/components/topbar";
import { updateOwnProfile } from "@/lib/api/resources";
import { invalidate } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * Figma "Advisee profile - Edit" (995:7152) plus the save-failed (995:7586) and
 * photo-rejected (995:7541) states, which insert an alert banner above the avatar.
 *
 * Figma "Desktop / Advisee profile - Edit (Light)" (1787:25320) and the same two
 * states (1787:25944, 1787:26037) hold the form in an 800px panel: the avatar
 * block turns the corner into its own column beside the fields, the banner
 * spans both, and the actions come off the bottom edge into a right-aligned
 * row under them.
 *
 * ## What it writes
 *
 * `PATCH /users/me` takes `displayName`, `fullName` and `timezone`, each optional
 * and each rejected empty (`@IsNotEmpty` after `@Trim`). Only the fields that
 * actually changed are sent, so saving an untouched form is not a write.
 *
 * `POST /users/me/avatar` is multipart on the field name `file`, JPEG/PNG/WebP up
 * to 5 MB, and it answers the new `avatarKey`. The picker is the change-photo
 * button, and both refusals — the wrong type, and over five megabytes — come back
 * as the API's own sentence rather than being guessed at here.
 *
 * ## The two banner states
 *
 * They were layout: three routes drawing the same form with a different strip on
 * top. They are outcomes now — a save that failed and a photo that was refused
 * both raise their own banner carrying the API's reason. `state` still forces one
 * open, which is what `/profile/edit/save-failed` and `.../photo-rejected` are
 * for, and in that case the body is the frame's copy because there is no API
 * error to quote.
 *
 * The email row stays locked and is read from the profile, because there is no
 * route on this API that changes an email — that belongs to better-auth, and the
 * note under the row already sends the reader to the account settings.
 */
export function EditProfileScreen({
  state = "default",
}: {
  readonly state?: "default" | "save-failed" | "photo-rejected";
}) {
  const t = useTranslations("profileEdit");
  const c = useTranslations("common");
  const router = useRouter();
  const profile = useOwnProfile();
  const picker = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(
    state === "save-failed" ? t("saveFailedBody") : null,
  );
  const [photoError, setPhotoError] = useState<string | null>(
    state === "photo-rejected" ? t("photoRejectedBody") : null,
  );

  // The form is seeded from the profile once it lands and is the reader's own
  // after that, so the fields are null until then rather than mirroring the
  // resource on every render — a controlled input that keeps snapping back to a
  // fetched value cannot be typed in.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !profile.data) return;
    seeded.current = true;
    setDisplayName(profile.data.displayName);
    setFullName(profile.data.fullName ?? "");
  }, [profile.data]);

  const nameValue = displayName ?? "";
  const fullValue = fullName ?? "";
  const ready = profile.data !== undefined;

  async function save() {
    if (!profile.data) return;
    // Only what changed. `@IsNotEmpty` rejects a blank, so an emptied field is
    // left out rather than sent for the API to refuse.
    const changes: { displayName?: string; fullName?: string } = {};
    const nextName = nameValue.trim();
    const nextFull = fullValue.trim();
    if (nextName && nextName !== profile.data.displayName) changes.displayName = nextName;
    if (nextFull && nextFull !== (profile.data.fullName ?? "")) changes.fullName = nextFull;

    if (Object.keys(changes).length === 0) {
      router.push("/profile");
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      await updateOwnProfile(changes);
      // Every screen reading the profile is now stale.
      invalidate("users/me");
      router.push("/profile");
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    try {
      await uploadOwnAvatar(file);
      // The presigned URL and the profile's `avatarKey` both changed.
      invalidate("users/me");
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/profile" label={c("back")} />
      <ScreenBody>
        <div className={ACCOUNT_NAV}>
          <TopBar unreadNotifications />
        </div>
        <AccountBackBar href="/profile" label={c("back")} />

        {/* Figma "Head Band" — the title on the card surface, above the page. */}
        <div className="w-full shrink-0 lg:bg-card">
          <ScreenHeading
            className={ACCOUNT_HEADING}
            subtitle={t("subtitle")}
            title={t("title")}
          />
        </div>

        {/* Figma "Form Band" — the panel the whole form moves into at 1440. */}
        <div className={cn("flex w-full flex-1 flex-col items-center", ACCOUNT_FORM_PANEL)}>
          {saveError ? (
            <AlertBanner
              body={saveError}
              className="lg:px-0 lg:pt-0"
              icon={BellOff}
              title={t("saveFailedTitle")}
            />
          ) : null}
          {photoError ? (
            <AlertBanner
              body={photoError}
              className="lg:px-0 lg:pt-0"
              icon={TriangleAlert}
              title={t("photoRejectedTitle")}
            />
          ) : null}
          {/* The read failed, so there is nothing to seed the form with and
              nothing to save against. The API's own sentence says which. */}
          {profile.error ? (
            <AlertBanner
              body={profile.error.message}
              className="lg:px-0 lg:pt-0"
              icon={TriangleAlert}
              title={t("saveFailedTitle")}
            />
          ) : null}

          {/* The phone stacks the portrait over the fields; the frame stands it
              beside them in a 180px column, which is what lets the two name
              rows and the locked address read as one form rather than three. */}
          <div
            className={cn(
              "flex w-full shrink-0 flex-col items-center lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start lg:gap-8",
              (saveError ?? photoError ?? profile.error) && "lg:pt-6",
            )}
          >
            {/* Figma "Avatar Edit": 96px avatar, 12px gap, auto-width neutral button. */}
            <div className="flex w-full shrink-0 flex-col items-center gap-3 px-6 pt-2 lg:px-0 lg:pt-0">
              <OwnAvatar className="size-24" size={96} />
              {/* The picker itself: `Input` rather than a bare <input>, so it
                  carries the primitive's states and clears the design guard. */}
              <Input
                accept={AVATAR_ACCEPT}
                aria-hidden
                className="sr-only"
                onChange={(event) => {
                  void changePhoto(event.target.files?.[0]);
                  event.target.value = "";
                }}
                ref={picker}
                tabIndex={-1}
                type="file"
              />
              <NeutralButton
                className="w-auto"
                disabled={!ready}
                onClick={() => picker.current?.click()}
                type="button"
              >
                {t("changePhoto")}
              </NeutralButton>
            </div>

            <div className="flex w-full shrink-0 flex-col items-start">
              {/* Figma "Form Fields": 20px top padding, 16px between fields. */}
              <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-5 lg:px-0 lg:pt-0">
                <Field
                  disabled={!ready}
                  id="display-name"
                  label={t("displayNameLabel")}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={t("displayNamePlaceholder")}
                  value={nameValue}
                />
                <Field
                  disabled={!ready}
                  id="full-name"
                  label={t("fullNameLabel")}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={t("fullNamePlaceholder")}
                  value={fullValue}
                />
              </div>

              {/* Figma "Email Locked": read-only card, then a 12/18 muted note.
                  Locked because no route on this API changes an email — that is
                  better-auth's, behind the account settings the note points at. */}
              <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-4 lg:px-0">
                {/* The read-only card is the page surface on the phone; inside
                    the panel it would vanish into it, so it takes the muted
                    tint the frame gives it there. */}
                <div className="flex w-full shrink-0 items-center gap-2.5 overflow-clip rounded-card bg-card p-3.5 lg:bg-muted/50">
                  <Lock className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                    <p className="w-full text-xs font-normal text-muted-foreground">
                      {c("email")}
                    </p>
                    <p className="font-latin w-full text-sm font-medium text-foreground">
                      {profile.data?.email ?? c("emailValue")}
                    </p>
                  </div>
                </div>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("emailNote")}
                </p>
              </div>
            </div>
          </div>

          {/* The phone frame pins its actions to the bottom edge; the panel is
              only as tall as its content, so the spacer goes with the frame and
              the stack turns into Figma's right-aligned row. */}
          <ScreenSpacer className={cn(saveError && "min-h-11.5", "lg:hidden")} />
          <ScreenActions className="lg:flex-row-reverse lg:justify-start lg:px-0 lg:pt-8 lg:pb-0">
            <PrimaryButton
              className="lg:w-auto"
              disabled={!ready || saving}
              onClick={() => void save()}
              type="button"
            >
              {saveError ? t("retry") : t("save")}
            </PrimaryButton>
            <NeutralButton className="lg:w-auto" href="/profile">
              {c("cancel")}
            </NeutralButton>
          </ScreenActions>
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
