"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";

import { AppFrame } from "@/components/account/app-frame";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { useProfileFacts } from "@/components/profile/identity-card";
import {
  AVATAR_ACCEPT,
  MAX_AVATAR_BYTES,
  OwnAvatar,
  uploadOwnAvatar,
  useOwnAvatarUrl,
} from "@/components/profile/profile-data";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, Field as FieldRoot } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateOwnProfile } from "@/lib/api/resources";
import { invalidate } from "@/lib/api/use-resource";

function TextField({ id, label, error, value, onChange, loading, disabled, autoComplete, inputRef }: {
  readonly id: string;
  readonly label: string;
  readonly error?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly loading: boolean;
  readonly disabled: boolean;
  readonly autoComplete: string;
  readonly inputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <FieldRoot className="gap-1" data-invalid={error ? true : undefined}>
      <FieldLabel className="min-h-5.25 text-sm font-medium text-foreground" htmlFor={id}>{label}</FieldLabel>
      {loading ? <span aria-hidden className="h-9 w-full animate-pulse rounded-md bg-muted" /> : (
        <Input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className="h-9 min-h-9 rounded-md border-input bg-muted px-3 text-sm shadow-none"
          id={id}
          disabled={disabled}
          onChange={event => onChange(event.target.value)}
          ref={inputRef}
          value={value}
        />
      )}
      {error ? <FieldError className="text-sm" id={`${id}-error`}>{error}</FieldError> : null}
    </FieldRoot>
  );
}

/** A failure said in place, under what it is about. */
type NameFields = { displayName?: string; fullName?: string };

/**
 * What is wrong with the names as typed: a display name always; a full name
 * once the account has one, since the API refuses either sent empty.
 */
function nameErrors(
  nextName: string,
  nextFull: string,
  current: { readonly fullName?: string | null },
  t: (key: "nameRequired" | "fullNameRequired") => string,
): NameFields {
  const found: NameFields = {};
  if (!nextName) found.displayName = t("nameRequired");
  if (!nextFull && current.fullName) found.fullName = t("fullNameRequired");
  return found;
}

/** Only the names that differ from what the account holds now. */
function nameChanges(
  nextName: string,
  nextFull: string,
  current: { readonly displayName: string; readonly fullName?: string | null },
): NameFields {
  const changes: NameFields = {};
  if (nextName !== current.displayName) changes.displayName = nextName;
  if (nextFull && nextFull !== (current.fullName ?? "")) changes.fullName = nextFull;
  return changes;
}

/**
 * Why a picked photo cannot be uploaded, by the API's own rules
 * (users/avatar.constants.ts), so a wrong file is refused before it is sent
 * rather than after; null when it can.
 */
function photoProblem(file: File): "photoTypeError" | "photoSizeError" | null {
  if (!AVATAR_ACCEPT.split(",").includes(file.type)) return "photoTypeError";
  if (file.size > MAX_AVATAR_BYTES) return "photoSizeError";
  return null;
}

/** Focus the first field with an error; true when there was one. */
function focusFirstError(
  found: NameFields,
  nameField: RefObject<HTMLInputElement | null>,
  fullField: RefObject<HTMLInputElement | null>,
): boolean {
  if (found.displayName) nameField.current?.focus();
  else if (found.fullName) fullField.current?.focus();
  return Boolean(found.displayName || found.fullName);
}

/** The save button's word: saving while it goes, "try again" after a failure. */
function saveLabelKey(saving: boolean, failed: boolean): "saving" | "retry" | "save" {
  if (saving) return "saving";
  return failed ? "retry" : "save";
}

/** What went wrong, in the API's own sentence when it gave one. */
function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * The photo control's upload: checked against the API's rules before it is
 * sent, `uploading` while it goes, and the reason when it is refused.
 * `onUploaded` refreshes whatever shows the portrait.
 */
function usePhotoUpload(rejected: boolean, onUploaded: () => void) {
  const t = useTranslations("profileEdit");
  const [photoError, setPhotoError] = useState<string | null>(rejected ? t("photoTypeError") : null);
  const [uploading, setUploading] = useState(false);

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    const problem = photoProblem(file);
    setPhotoError(problem ? t(problem) : null);
    if (problem) return;
    setUploading(true);
    try {
      await uploadOwnAvatar(file);
      onUploaded();
    } catch (cause) {
      setPhotoError(messageOf(cause));
    } finally {
      setUploading(false);
    }
  }

  return { photoError, uploading, changePhoto };
}

/** The way to the account settings inside the email note (`t.rich`'s `<link>`). */
function settingsLink(chunks: ReactNode) {
  return (
    <Link
      className="font-medium text-foreground underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      href="/settings"
    >
      {chunks}
    </Link>
  );
}

function InlineAlert({ title, body, photo = false }: {
  readonly title: string;
  readonly body: string;
  readonly photo?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive bg-card px-3.25 py-2.75" role="alert">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="shrink-0" src={photo ? "/figma/profile-edit/triangle-alert.svg" : "/figma/profile-edit/bell-off.svg"} width={18} height={18} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

export function EditProfileScreen({
  state = "default",
}: {
  readonly state?: "default" | "save-failed" | "photo-rejected";
}) {
  const t = useTranslations("profileEdit");
  const c = useTranslations("common");
  const router = useRouter();
  const { profile, email } = useProfileFacts();
  const avatar = useOwnAvatarUrl();
  const picker = useRef<HTMLInputElement>(null);
  const nameField = useRef<HTMLInputElement>(null);
  const fullField = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ readonly displayName?: string; readonly fullName?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(
    state === "save-failed" ? t("saveFailedHint") : null,
  );
  const { photoError, uploading, changePhoto } = usePhotoUpload(state === "photo-rejected", () => {
    // The presigned URL and the profile's `avatarKey` both changed; asking
    // again redraws every portrait on the page, the sidebar's included.
    invalidate("users/me");
    avatar.reload();
    profile.reload();
  });

  // The form is seeded from the profile once it lands and is the reader's own
  // after that, so the fields are null until then rather than mirroring the
  // resource on every render: a controlled input that keeps snapping back to a
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
  const ready = profile.data !== undefined && displayName !== null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile.data || saving || uploading) return;
    const nextName = nameValue.trim();
    const nextFull = fullValue.trim();

    const found = nameErrors(nextName, nextFull, profile.data, t);
    setErrors(found);
    if (focusFirstError(found, nameField, fullField)) return;

    const changes = nameChanges(nextName, nextFull, profile.data);
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
      setSaveError(messageOf(cause));
    } finally {
      setSaving(false);
    }
  }

  const pick = () => picker.current?.click();
  const photoBusy = !profile.data || uploading || saving;
  const saveLabel = t(saveLabelKey(saving, saveError !== null));

  return (
    <MobileScreen className="profile-edit-page bg-background pb-0" wide="md">
      <ScreenTopBar className="pt-2 lg:hidden" href="/profile" label={c("back")} />
      <AppFrame active="profile">
        <ScreenBody className="bg-background">
          <div className="mx-auto flex w-full max-w-[848px] flex-col px-6 lg:pt-12 lg:pb-22">
            <h1 className="pt-4 text-heading font-semibold lg:pt-0">{t("title")}</h1>
            <p className="pt-2 pb-2 text-sm text-muted-foreground">{t("subtitle")}</p>
            {profile.error ? (
              <ApiErrorCard error={profile.error} onRetry={profile.reload} title={t("loadFailedTitle")} />
            ) : (
              <form aria-label={t("title")} className="profile-edit-card flex min-h-[calc(100dvh-136px)] flex-col lg:mt-12 lg:min-h-0 lg:gap-6 lg:rounded-[16px] lg:border lg:border-border lg:bg-card lg:p-9.75" noValidate onSubmit={event => void save(event)}>
                <Input accept={AVATAR_ACCEPT} aria-hidden className="sr-only size-px" disabled={photoBusy} onChange={event => { void changePhoto(event.target.files?.[0]); event.target.value = ""; }} ref={picker} tabIndex={-1} type="file" />
                {saveError || photoError ? (
                  <div className="flex flex-col gap-2 pt-2 lg:pt-0">
                    {saveError ? <InlineAlert title={t("saveFailedTitle")} body={saveError} /> : null}
                    {photoError ? <InlineAlert photo title={t("photoRejectedTitle")} body={photoError} /> : null}
                  </div>
                ) : null}
                <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">
                  <div className="flex flex-col items-center gap-3 pt-2 lg:w-45 lg:shrink-0 lg:pt-0">
                    <OwnAvatar className={`size-24 text-3xl ${photoError ? "outline-2 -outline-offset-2 outline-destructive" : ""}`} fluid size={96} />
                    <Button className="h-9 rounded-md bg-card px-4 text-sm shadow-none" disabled={photoBusy} onClick={pick} type="button" variant="outline">
                      {uploading ? t("photoUploading") : t("changePhoto")}
                    </Button>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-4 pt-5 lg:gap-5 lg:pt-0">
                    <div className="flex flex-col gap-4">
                      <TextField id="display-name" label={t("displayNameLabel")} autoComplete="nickname" value={nameValue} onChange={value => { setDisplayName(value); setErrors({ ...errors, displayName: undefined }); }} error={errors.displayName} loading={!ready} disabled={saving} inputRef={nameField} />
                      <TextField id="full-name" label={t("fullNameLabel")} autoComplete="name" value={fullValue} onChange={value => { setFullName(value); setErrors({ ...errors, fullName: undefined }); }} error={errors.fullName} loading={!ready} disabled={saving} inputRef={fullField} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5 rounded-xl bg-card p-3.5 lg:border lg:border-border lg:bg-muted lg:p-3.25">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="" className="shrink-0" src="/figma/profile-edit/lock.svg" width={16} height={16} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground">{c("email")}</span>
                          <span className="truncate font-latin text-sm font-medium">{email}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.rich("emailNoteLinked", { link: settingsLink })}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex flex-col gap-3 pt-12 pb-2 lg:mt-0 lg:flex-row lg:items-center lg:justify-end lg:pt-2 lg:pb-0">
                  <Button aria-busy={saving || undefined} className={`h-9 w-full rounded-md bg-info text-sm text-primary-foreground hover:bg-info/90 lg:order-2 ${saveError ? "lg:w-45" : "lg:w-52.5"}`} disabled={!ready || saving || uploading} type="submit">
                    {saving ? <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" /> : null}{saveLabel}
                  </Button>
                  <Button className="h-9 w-full rounded-md bg-card text-sm shadow-none lg:order-1 lg:h-11 lg:w-30" nativeButton={false} render={<Link href="/profile" />} variant="outline">{c("cancel")}</Button>
                </div>
              </form>
            )}
          </div>
        </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}
