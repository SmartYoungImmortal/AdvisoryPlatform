"use client";

import { Camera, LoaderCircle, Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { useMountTime } from "@/components/bookings/booking-flow";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import {
  IdentityRow,
  PORTRAIT,
  ProfileCover,
  ProfileCrumb,
  ProfileHero,
  profilePill,
  useProfileFacts,
} from "@/components/profile/identity-card";
import {
  AVATAR_ACCEPT,
  MAX_AVATAR_BYTES,
  OwnAvatar,
  uploadOwnAvatar,
  useBookingHistory,
  useOwnAvatarUrl,
} from "@/components/profile/profile-data";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError, FieldLabel, Field as FieldRoot } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateOwnProfile } from "@/lib/api/resources";
import { invalidate } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * A text field as the sign-up form draws one (a grey label over a white box
 * on a hairline), at a 44px target on the phone, 48 on a tablet and 56 with
 * 18px type from `lg`, where the page is zoomed down from 1710. The hint gives
 * way to the error, which sits under the box it is about.
 */
function TextField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  loading,
  autoComplete,
  inputRef,
}: {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** No profile to seed it with yet: the box's shape, not an empty field. */
  readonly loading: boolean;
  readonly autoComplete?: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const note = `${id}-note`;
  let footnote: ReactNode = null;
  if (error) {
    footnote = (
      <FieldError className="text-sm lg:text-frame-meta" id={note}>
        {error}
      </FieldError>
    );
  } else if (hint) {
    footnote = (
      <FieldDescription className="text-sm lg:text-frame-meta" id={note}>
        {hint}
      </FieldDescription>
    );
  }

  return (
    <FieldRoot className="gap-1.5 lg:gap-2" data-invalid={error ? true : undefined}>
      <FieldLabel className="text-sm font-medium text-muted-foreground md:text-base" htmlFor={id}>
        {label}
      </FieldLabel>
      {loading ? (
        <span aria-hidden className="h-11 w-full animate-pulse rounded-xl bg-muted md:h-12" />
      ) : (
        <Input
          aria-describedby={footnote ? note : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className="h-11 rounded-xl border-accented bg-card px-4 text-base shadow-none md:h-12 md:text-base lg:px-[19px] lg:text-frame-body"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          ref={inputRef}
          value={value}
        />
      )}
      {footnote}
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

function InlineAlert({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive lg:text-frame-meta"
      role="alert"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-4.5 shrink-0 lg:size-5" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-foreground/80">{body}</span>
      </span>
    </div>
  );
}

/**
 * `/profile/edit` and `/profile/edit/save-failed`: the profile's own frame
 * (`ProfileHero`: crumb, identity and cover) with its facts turned
 * into fields where they stand: the photo control is the portrait, the display
 * name is where the name is, the address stays locked on the handle line. The
 * cover is the profile's, unchanged, so the page reads as the profile being
 * edited rather than as a form somewhere else. Under the line where the
 * profile has its tabs, the rest of the details and the save bar.
 *
 * ## What it writes
 *
 * `PATCH /users/me` takes `displayName`, `fullName` and `timezone`, each optional
 * and each rejected empty (`@IsNotEmpty` after `@Trim`). Only the fields that
 * actually changed are sent, so saving an untouched form is not a write, and
 * an emptied field is caught here with its own message rather than sent for
 * the API to refuse.
 *
 * `POST /users/me/avatar` is multipart on the field name `file`, JPEG/PNG/WebP
 * up to 5 MB. The same two rules are checked before the upload, so a wrong
 * file is refused at once; anything else the API refuses comes back as its
 * own sentence.
 *
 * ## The failed save
 *
 * Said in place, above the save bar it is about, with the API's reason; the
 * edits stay in the fields and the button becomes "try again".
 * `/profile/edit/save-failed` forces that state open, with a body that says what
 * is true without an API error to quote.
 *
 * The email is shown locked: no route on this API changes an email, that is
 * better-auth's, behind the account settings the note links to.
 */
export function EditProfileScreen({
  state = "default",
}: {
  readonly state?: "default" | "save-failed" | "photo-rejected";
}) {
  const t = useTranslations("profileEdit");
  const p = useTranslations("profile");
  const c = useTranslations("common");
  const router = useRouter();
  const now = useMountTime();
  const history = useBookingHistory(now);
  const { profile, email, verified } = useProfileFacts();
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
  const [photoError, setPhotoError] = useState<string | null>(
    state === "photo-rejected" ? t("photoTypeError") : null,
  );
  const [uploading, setUploading] = useState(false);

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
    if (!profile.data || saving) return;
    const nextName = nameValue.trim();
    const nextFull = fullValue.trim();

    const found = nameErrors(nextName, nextFull, profile.data, t);
    setErrors(found);
    if (found.displayName) {
      nameField.current?.focus();
      return;
    }
    if (found.fullName) {
      fullField.current?.focus();
      return;
    }

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
      setSaveError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    const problem = photoProblem(file);
    setPhotoError(problem ? t(problem) : null);
    if (problem) return;
    setUploading(true);
    try {
      await uploadOwnAvatar(file);
      // The presigned URL and the profile's `avatarKey` both changed; asking
      // again redraws every portrait on the page, the sidebar's included.
      invalidate("users/me");
      avatar.reload();
      profile.reload();
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUploading(false);
    }
  }

  const pick = () => picker.current?.click();
  const photoBusy = !profile.data || uploading;
  let saveLabel = t("save");
  if (saving) saveLabel = t("saving");
  else if (saveError) saveLabel = t("retry");

  return (
    // White under the back chevron too, so the phone's top strip is the page
    // and not a grey band above it.
    <MobileScreen className="bg-card pb-0" wide="md">
      <ScreenTopBar className="lg:hidden" href="/profile" label={c("back")} />
      <AppFrame active="profile">
      <ScreenBody className="bg-card">
        <AccountShell active="profile">
          <div className="flex w-full shrink-0 flex-col gap-4 px-4 pb-6 md:px-8 lg:gap-6 lg:p-0">
            {/* The picker itself: `Input` rather than a bare <input>, so it
                carries the primitive's states and clears the design guard. */}
            <Input
              accept={AVATAR_ACCEPT}
              aria-hidden
              // `size-px` as well: `sr-only` alone lost to the primitive's own
              // `w-full h-9`, leaving a clipped box the width of the page.
              className="sr-only size-px"
              onChange={(event) => {
                void changePhoto(event.target.files?.[0]);
                event.target.value = "";
              }}
              ref={picker}
              tabIndex={-1}
              type="file"
            />

            <ProfileCrumb current={t("title")} />
            <h1 className="sr-only">{t("title")}</h1>

            {profile.error ? (
              <ApiErrorCard error={profile.error} onRetry={profile.reload} title={t("loadFailedTitle")} />
            ) : (
              <form aria-label={t("title")} className="flex flex-col gap-4 lg:gap-6" noValidate onSubmit={(event) => void save(event)}>
                <ProfileHero
                    cover={<ProfileCover categories={history.categories} />}
                    identity={
                      <IdentityRow
                        portrait={
                          <Button
                            aria-busy={uploading || undefined}
                            aria-label={t("changePhoto")}
                            className="group relative block h-auto rounded-full border-0 p-0 hover:bg-transparent disabled:opacity-100"
                            disabled={photoBusy}
                            onClick={pick}
                            type="button"
                            variant="ghost"
                          >
                            <OwnAvatar className={PORTRAIT} fluid size={112} />
                            {/* The photo darkens under the pointer, the way a
                                photo that can be swapped usually does. */}
                            <span
                              aria-hidden
                              className="absolute inset-0 rounded-full bg-scrim/0 transition-colors duration-200 group-hover:bg-scrim/25 motion-reduce:transition-none"
                            />
                            <span
                              aria-hidden
                              className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-card bg-hero-action text-hero-action-foreground md:size-9 lg:size-10"
                            >
                              <Camera className="size-4 lg:size-5" />
                            </span>
                            {uploading ? (
                              <span aria-hidden className="absolute inset-0 flex items-center justify-center rounded-full bg-card/70">
                                <LoaderCircle className="size-6 animate-spin text-foreground motion-reduce:animate-none" />
                              </span>
                            ) : null}
                          </Button>
                        }
                      >
                        <TextField
                          autoComplete="nickname"
                          error={errors.displayName}
                          hint={t("displayNameHint")}
                          id="display-name"
                          inputRef={nameField}
                          label={t("displayNameLabel")}
                          loading={!ready}
                          onChange={(value) => {
                            setDisplayName(value);
                            if (errors.displayName) setErrors({ ...errors, displayName: undefined });
                          }}
                          value={nameValue}
                        />
                        {/* The profile's handle line, locked: no route on this API
                            changes an email. */}
                        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground md:text-base">
                          <Lock aria-hidden className="size-4 shrink-0" />
                          <span className="min-w-0 truncate font-latin text-foreground">{email}</span>
                          {verified ? <span className="text-success">{p("emailVerified")}</span> : null}
                          <span aria-hidden>·</span>
                          <span>{p("role")}</span>
                        </p>
                        <div aria-live="polite" className="mt-3 flex flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <Button className={profilePill()} disabled={photoBusy} onClick={pick} type="button" variant="outline">
                              <Camera aria-hidden />
                              {t("changePhoto")}
                            </Button>
                            <span className="text-sm text-muted-foreground lg:text-frame-meta">
                              {uploading ? t("photoUploading") : t("photoHint")}
                            </span>
                          </div>
                          {photoError ? <InlineAlert body={photoError} title={t("photoRejectedTitle")} /> : null}
                        </div>
                      </IdentityRow>
                    }
                  />

                {/* Where the profile has its tabs, the one section this page has. */}
                <div className="mt-2 border-b border-border lg:mt-4">
                  <h2 className="relative inline-flex h-12 items-center text-base font-medium text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground lg:h-14 lg:text-frame-body lg:font-semibold">
                    {t("detailsTitle")}
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
                  <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
                    <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("subtitle")}</p>
                    <TextField
                      autoComplete="name"
                      error={errors.fullName}
                      hint={t("fullNameHint")}
                      id="full-name"
                      inputRef={fullField}
                      label={t("fullNameLabel")}
                      loading={!ready}
                      onChange={(value) => {
                        setFullName(value);
                        if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                      }}
                      value={fullValue}
                    />
                    <div className="flex flex-col gap-1.5 lg:gap-2">
                      <span className="text-sm font-medium text-muted-foreground md:text-base">{c("email")}</span>
                      <div className="flex h-11 items-center gap-3 rounded-xl bg-muted/60 px-4 md:h-12 lg:px-[19px]">
                        <Lock aria-hidden className="size-4 shrink-0 text-muted-foreground lg:size-[19px]" />
                        <span className="min-w-0 flex-1 truncate font-latin text-base text-foreground lg:text-frame-body">
                          {email ?? <span aria-hidden className="block h-4 w-48 animate-pulse rounded-md bg-muted" />}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground lg:text-frame-meta">
                        {t.rich("emailNoteLinked", { link: settingsLink })}
                      </p>
                    </div>

                    {saveError ? <InlineAlert body={saveError} title={t("saveFailedTitle")} /> : null}

                    {/* The bar holds the bottom of the screen on the phone while
                        the form is in view; on a desktop it ends the column. */}
                    <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-card/90 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8 lg:static lg:mx-0 lg:justify-end lg:bg-transparent lg:px-0 lg:pt-6 lg:pb-0 lg:backdrop-blur-none">
                      <Button
                        className={cn(profilePill(), "flex-1 lg:flex-none")}
                        nativeButton={false}
                        render={<Link href="/profile" />}
                        variant="outline"
                      >
                        {c("cancel")}
                      </Button>
                      <Button
                        aria-busy={saving || undefined}
                        className={cn(profilePill(true), "flex-[2] lg:flex-none")}
                        disabled={!ready || saving}
                        type="submit"
                      >
                        {saving ? <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" /> : null}
                        {saveLabel}
                      </Button>
                    </div>
                  </div>

                  {/* What this form changes for the other side: the advisor sees
                      the portrait and the display name, and nothing else here. */}
                  <aside aria-labelledby="edit-preview" className="flex flex-col gap-3 lg:gap-4">
                    <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading" id="edit-preview">
                      {t("previewTitle")}
                    </h2>
                    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 lg:p-5">
                      <OwnAvatar className="text-base" size={56} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-base font-semibold text-foreground lg:text-frame-body">
                          {nameValue.trim() || profile.data?.displayName || " "}
                        </span>
                        <span className="text-sm text-muted-foreground lg:text-frame-meta">{p("role")}</span>
                      </span>
                    </div>
                    {/* `AdvisorBookingResponseDto` carries the display name, "never
                        their email or legal name", which is what this says. */}
                    <p className="flex items-start gap-2 text-sm text-muted-foreground lg:text-frame-meta">
                      <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success lg:size-5" />
                      {t("previewPrivate")}
                    </p>
                  </aside>
                </div>
              </form>
            )}
          </div>
        </AccountShell>
      </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}
