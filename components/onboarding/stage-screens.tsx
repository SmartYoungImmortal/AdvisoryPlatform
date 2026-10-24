"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  FileText,
  IdCard,
  ImageIcon,
  ImageUp,
  LockKeyhole,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { FilePickButton } from "@/components/onboarding/file-pick";
import { ApplicationStepper, OnboardingSplit, StageHeading } from "@/components/onboarding/frame";
import {
  ApplicationField,
  ApplicationTextarea,
  CheckLine,
  DocumentDrop,
  NOTE,
  NoticeBanner,
  PICK,
  describeFile,
} from "@/components/onboarding/parts";
import { Button } from "@/components/ui/button";
import { ApiError, type Paginated } from "@/lib/api/client";
import type { ApiNamedRecord } from "@/lib/api/types";
import {
  createAdvisorProfile,
  getOwnAdvisorProfile,
  submitIdentityDocument,
  submitSkillProof,
  updateAdvisorProfile,
} from "@/lib/api/onboarding";
import { listSkills } from "@/lib/api/resources";
import { invalidate, useResource } from "@/lib/api/use-resource";
import {
  clearDraft,
  dropFile,
  heldFile,
  holdFile,
  isThaiPhone,
  parseBirthDate,
  updateDraft,
  useOnboardingDraft,
} from "@/lib/session/onboarding";
import { cn } from "@/lib/utils";

/** The back and next pair under every stage: back a white capsule, next the hero's black one. */
function StageActions({
  backHref,
  backLabel,
  children,
  note,
}: {
  readonly backHref: string;
  readonly backLabel: string;
  /** The forward button. */
  readonly children: ReactNode;
  readonly note?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {note}
      <div className="flex items-center gap-3">
        <Button
          className={cn(authPill(), "w-auto shrink-0 px-4 md:px-5")}
          nativeButton={false}
          render={<Link href={backHref} />}
          variant="outline"
        >
          <ArrowLeft aria-hidden />
          {backLabel}
        </Button>
        {children}
      </div>
    </div>
  );
}

/** The forward button: the sign-in page's black capsule, taking the rest of the row. */
const NEXT = cn(authPill(true), "min-w-0 flex-1");

/** The stage's heading and form, under the stepper. */
function StageBody({ children }: { readonly children: ReactNode }) {
  // The sign-in pages' rhythm: 20px between blocks on the phone, 24 above it.
  return <div className="flex flex-col gap-5 pt-5 md:gap-6 md:pt-6">{children}</div>;
}

/**
 * `dd/mm/yyyy` as it is typed. A phone's number pad has no slash, so the
 * slashes go in by themselves after the day and the month; a slash typed after
 * one digit closes that part early ("6/" → "06/"). The check on submit is still
 * `parseBirthDate`, unchanged.
 */
function maskBirthDate(raw: string): string {
  const parts = [""];
  for (const ch of raw) {
    const i = parts.length - 1;
    const limit = i < 2 ? 2 : 4;
    if (ch >= "0" && ch <= "9") {
      if (parts[i].length < limit) parts[i] += ch;
      else if (i < 2) parts.push(ch);
    } else if (ch === "/" && parts[i] && i < 2) {
      parts[i] = parts[i].padStart(2, "0");
      parts.push("");
    }
  }
  return parts.join("/");
}

/** Figma "Advisor Onboarding - Stage 1" (995:6215) and its error state (995:6452). */
export function OnboardingStage1Screen() {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const draft = useOnboardingDraft();
  const [errors, setErrors] = useState<{ name?: string; phone?: string; dob?: string }>({});
  const failed = Boolean(errors.name || errors.phone || errors.dob);

  const nameOk = draft.legalName.trim().split(/\s+/).length >= 2;
  const phoneOk = isThaiPhone(draft.phone);
  const dobOk = parseBirthDate(draft.birthDate) !== null;
  const progress = [nameOk, phoneOk, dobOk].filter(Boolean).length / 3;

  function next() {
    const found: typeof errors = {};
    if (!nameOk) found.name = t("legalNameError");
    if (!phoneOk) found.phone = t("phoneError");
    if (!draft.birthDate.trim()) found.dob = t("dobError");
    else if (!dobOk) found.dob = t("dobFormatError");
    setErrors(found);
    if (Object.keys(found).length === 0) {
      router.push("/advisor-onboarding/stage-2");
      return;
    }
    // Straight to the first answer that needs work, rather than leaving the
    // applicant to find it under the banner.
    const first = (["name", "phone", "dob"] as const).find((key) => found[key]);
    if (first) document.getElementById(`ob-${first}`)?.focus();
  }

  return (
    <OnboardingSplit
      actions={
        <StageActions backHref="/advisor/apply" backLabel={c("back")}>
          <Button
            className={NEXT}
            disabled={!draft.legalName.trim() || !draft.phone.trim() || !draft.birthDate.trim()}
            onClick={next}
            type="button"
          >
            {t("continue")}
            <ArrowRight aria-hidden />
          </Button>
        </StageActions>
      }
    >
      <ApplicationStepper progress={progress} step={1} />
      <StageBody>
        <StageHeading lead={t("s1Lead")} title={t("s1Title")} />

        {failed ? (
          <NoticeBanner title={t("s1ErrorTitle")}>{t("s1ErrorBody")}</NoticeBanner>
        ) : null}

        {/* The name alone on its row, the two short answers side by side from
            the tablet up, then the introduction under all of them. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
          <div className="md:col-span-2">
            <ApplicationField
              autoComplete="name"
              error={errors.name}
              id="ob-name"
              label={t("legalNameLabel")}
              onChange={(event) => {
                updateDraft({ legalName: event.target.value });
                setErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder={t("legalNamePlaceholder")}
              value={draft.legalName}
            />
          </div>
          <ApplicationField
            autoComplete="tel"
            error={errors.phone}
            icon={Phone}
            id="ob-phone"
            inputMode="tel"
            label={t("phoneLabel")}
            latin
            onChange={(event) => {
              updateDraft({ phone: event.target.value });
              setErrors((e) => ({ ...e, phone: undefined }));
            }}
            placeholder={t("phonePlaceholder")}
            type="tel"
            value={draft.phone}
          />
          {/* No `bday` autofill: a browser fills it in its own date format,
              which the slash mask would scramble. */}
          <ApplicationField
            error={errors.dob}
            hint={t("dobHint")}
            icon={CalendarDays}
            id="ob-dob"
            inputMode="numeric"
            label={t("dobLabel")}
            latin
            maxLength={10}
            onChange={(event) => {
              updateDraft({ birthDate: maskBirthDate(event.target.value) });
              setErrors((e) => ({ ...e, dob: undefined }));
            }}
            placeholder={t("dobPlaceholder")}
            value={draft.birthDate}
          />
          <div className="md:col-span-2">
            <ApplicationTextarea
              hint={t("bioHint")}
              id="ob-bio"
              label={t("bioIntroLabel")}
              onChange={(event) => updateDraft({ bio: event.target.value })}
              optional={t("optional")}
              placeholder={t("bioPlaceholder")}
              value={draft.bio}
            />
          </div>
        </div>
      </StageBody>
    </OnboardingSplit>
  );
}

const IMAGE_TYPES = "image/jpeg,image/png";
const MAX_BYTES = 50 * 1024 * 1024;

/** A preview URL for a picked image, revoked when it changes or the screen goes. */
function usePreview(file: File | undefined): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

/**
 * The attached ID card: the photo itself, then its name and size with a
 * green "attached" mark, then replace and remove. While the browser is still
 * opening a large photo the frame says so instead of sitting blank; a file it
 * cannot draw at all keeps its name and a plain mark, and stays attached.
 */
function AttachedDocument({
  file,
  preview,
  onReplace,
  onRemove,
}: {
  readonly file: File;
  readonly preview: string | null;
  readonly onReplace: (file: File) => void;
  readonly onRemove: () => void;
}) {
  const t = useTranslations("advisorOnboarding");
  const [shown, setShown] = useState<"opening" | "drawn" | "undrawable">("opening");

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-card border border-hero-card-border bg-muted shadow-hero-card">
        {preview && shown !== "undrawable" ? (
          // A blob URL of the applicant's own file: nothing for next/image to
          // optimise, and it never leaves the browser until the application is sent.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={t("idPreviewAlt")}
            className={cn(
              "size-full object-contain transition-opacity duration-200 motion-reduce:transition-none",
              shown === "drawn" ? "opacity-100" : "opacity-0",
            )}
            onError={() => setShown("undrawable")}
            onLoad={() => setShown("drawn")}
            src={preview}
          />
        ) : (
          <ImageIcon aria-hidden className="size-10 text-muted-foreground" />
        )}
        {shown === "opening" && preview ? (
          <span className={cn("absolute inset-0 flex items-center justify-center text-muted-foreground", NOTE)} role="status">
            {t("preparing")}
          </span>
        ) : null}
      </div>
      <div className="flex w-full items-center gap-3 rounded-card bg-muted px-3.5 py-2.5">
        <div className="flex min-w-px flex-1 flex-col gap-0.5">
          <p className="truncate font-latin text-sm font-medium text-foreground">{file.name}</p>
          <p className="font-latin text-xs text-muted-foreground tabular-nums">{describeFile(file)}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
          <CircleCheck aria-hidden className="size-4" />
          {t("attachedLabel")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FilePickButton accept={IMAGE_TYPES} className={PICK} onPick={onReplace}>
          <ImageUp aria-hidden />
          {t("replace")}
        </FilePickButton>
        <Button
          className={cn(PICK, "border-transparent text-destructive hover:bg-destructive/5 hover:text-destructive")}
          onClick={onRemove}
          type="button"
          variant="outline"
        >
          <Trash2 aria-hidden />
          {t("remove")}
        </Button>
      </div>
    </div>
  );
}

/** Why a picked file was turned away, kept to say so in the banner. */
type Refused = { readonly name: string; readonly what: string };

/**
 * Figma "Advisor Onboarding - Stage 2" (995:6250), its uploaded state (995:6292)
 * and its rejected state (995:6496), all on this one route now.
 */
export function OnboardingStage2Screen() {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const draft = useOnboardingDraft();
  const [refused, setRefused] = useState<Refused | null>(null);
  // The file itself lives in memory (`holdFile`); after a reload only its name
  // is left, which is not something to send, so it counts as not uploaded.
  const [file, setFile] = useState<File | undefined>(() => heldFile("id"));
  const preview = usePreview(file);
  const uploaded = file !== undefined;
  const lost = !uploaded && !refused && draft.idFileName ? draft.idFileName : null;

  function pick(picked: File) {
    // The frame's rejection is about format; anything but JPG/PNG gets it.
    // The API holds the same line, and 50 MB besides.
    if (!/\.(jpe?g|png)$/i.test(picked.name) || picked.size > MAX_BYTES) {
      setRefused({ name: picked.name, what: describeFile(picked) });
      dropFile("id");
      setFile(undefined);
      updateDraft({ idFileName: null });
      return;
    }
    setRefused(null);
    holdFile("id", picked);
    setFile(picked);
    updateDraft({ idFileName: picked.name });
  }

  function remove() {
    dropFile("id");
    setFile(undefined);
    updateDraft({ idFileName: null });
  }

  return (
    <OnboardingSplit
      actions={
        <StageActions backHref="/advisor-onboarding/stage-1" backLabel={c("back")}>
          <Button
            className={NEXT}
            disabled={!uploaded}
            onClick={() => router.push("/advisor-onboarding/stage-3")}
            type="button"
          >
            {t("continue")}
            <ArrowRight aria-hidden />
          </Button>
        </StageActions>
      }
    >
      <ApplicationStepper progress={uploaded ? 1 : 0} step={2} />
      <StageBody>
        <StageHeading lead={t("s2Lead")} title={t("s2Title")} />

        {refused ? <NoticeBanner title={t("s2ErrorTitle")}>{t("idRefusedBody", refused)}</NoticeBanner> : null}

        <div className="flex flex-col gap-3">
          {file ? (
            <AttachedDocument
              file={file}
              key={`${file.name}-${file.size}-${file.lastModified}`}
              onRemove={remove}
              onReplace={pick}
              preview={preview}
            />
          ) : (
            <DocumentDrop
              accept={IMAGE_TYPES}
              icon={IdCard}
              invalid={refused !== null}
              onPick={pick}
              pickLabel={t("browse")}
              rule={t("idFileRule")}
              title={t("uploadTitle")}
            />
          )}
          {lost ? <p className={cn("text-muted-foreground", NOTE)}>{t("idLost", { name: lost })}</p> : null}
        </div>

        {/* What gets a card through review first time, ahead of the camera. */}
        <section className="flex flex-col gap-2.5 rounded-card border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">{t("photoTipsTitle")}</h2>
          <ul className="flex flex-col gap-2">
            <CheckLine>{t("check1")}</CheckLine>
            <CheckLine>{t("check2")}</CheckLine>
            <CheckLine>{t("check3")}</CheckLine>
          </ul>
          <p className={cn("flex items-start gap-2 border-t border-border pt-2.5 text-muted-foreground", NOTE)}>
            <LockKeyhole aria-hidden className="mt-px size-3.5 shrink-0" />
            {t("idPrivacy")}
          </p>
        </section>
      </StageBody>
    </OnboardingSplit>
  );
}

const PROOF_TYPES = "image/jpeg,image/png,application/pdf";

/** The API's own rule for a skill proof (`skill-proofs.constants.ts`), checked here first. */
function isProofFile(file: File): boolean {
  return /\.(jpe?g|png|pdf)$/i.test(file.name) && file.size <= MAX_BYTES;
}

/** What stopped an application from going out, as the banner explains it. */
type SubmitProblem =
  | { readonly kind: "missing" }
  | { readonly kind: "unknown"; readonly skill: string }
  | { readonly kind: "id" }
  | { readonly kind: "failed"; readonly message: string };

type Draft = ReturnType<typeof useOnboardingDraft>;

/**
 * Checks the draft against the catalogue and the files in memory, and returns
 * each skill's id and proof, or the first thing wrong with it.
 */
function readyToSend(
  draft: Draft,
  catalogue: readonly ApiNamedRecord[],
): { readonly proofs: ReadonlyArray<{ skillId: string; file: File }> } | SubmitProblem {
  const filled = draft.skills.filter((s) => s.skill.trim());
  if (filled.length === 0) return { kind: "missing" };
  const proofs: { skillId: string; file: File }[] = [];
  for (const entry of filled) {
    const name = entry.skill.trim();
    const known = catalogue.find((skill) => skill.name === name);
    if (!known) return { kind: "unknown", skill: name };
    const file = heldFile(entry.id);
    if (!file) return { kind: "missing" };
    proofs.push({ skillId: known.id, file });
  }
  return { proofs };
}

/**
 * Sends the application in the order the API needs it (docs/api-spec.md,
 * "Advisor onboarding"): the profile, the ID card, then one proof per skill.
 *
 * Safe to press again after a failure part-way: an existing profile is updated
 * rather than created twice, and an ID card already under review is not sent
 * again. The name, phone and birth date stay in this browser: the API takes
 * none of them, the reviewer reads the name off the card.
 */
async function sendApplication(draft: Draft, catalogue: readonly ApiNamedRecord[]): Promise<SubmitProblem | null> {
  const ready = readyToSend(draft, catalogue);
  if ("kind" in ready) return ready;
  try {
    const headline = draft.skills.find((s) => s.skill.trim())?.skill.trim() ?? "";
    const bio = draft.bio.trim() || undefined;
    const existing = await getOwnAdvisorProfile();
    const profile = existing
      ? await updateAdvisorProfile({ bio })
      : await createAdvisorProfile({ headline, bio });
    if (profile.verificationStatus === "NONE" || profile.verificationStatus === "REJECTED") {
      const id = heldFile("id");
      if (!id) return { kind: "id" };
      await submitIdentityDocument(id);
    }
    await Promise.all(ready.proofs.map((proof) => submitSkillProof(proof.skillId, proof.file)));
    return null;
  } catch (error) {
    return { kind: "failed", message: error instanceof ApiError ? error.message : String(error) };
  }
}

/** The banner over the skill cards for whatever stopped the application. */
function SubmitBanner({ problem }: { readonly problem: SubmitProblem }) {
  const t = useTranslations("advisorOnboarding");
  switch (problem.kind) {
    case "missing":
      return <NoticeBanner title={t("s3ErrorTitle")}>{t("s3ErrorBody")}</NoticeBanner>;
    case "unknown":
      return (
        <NoticeBanner title={t("unknownSkillTitle")}>{t("unknownSkillBody", { skill: problem.skill })}</NoticeBanner>
      );
    case "id":
      return (
        <NoticeBanner title={t("idMissingTitle")}>
          {t("idMissingBody")}{" "}
          <Link className="font-semibold text-foreground underline underline-offset-2" href="/advisor-onboarding/stage-2">
            {t("backToStage2")}
          </Link>
        </NoticeBanner>
      );
    case "failed":
      return <NoticeBanner title={t("submitFailedTitle")}>{problem.message}</NoticeBanner>;
  }
}

/** An attached proof inside its skill card: what it is, and the way to take it off. */
function AttachedProof({ file, onRemove }: { readonly file: File; readonly onRemove: () => void }) {
  const t = useTranslations("advisorOnboarding");
  const Icon = /\.pdf$/i.test(file.name) ? FileText : ImageIcon;
  return (
    <div className="flex w-full items-center gap-3 rounded-card bg-muted py-1.5 pr-1 pl-3.5">
      <Icon aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-px flex-1 flex-col gap-0.5">
        <p className="truncate font-latin text-sm font-medium text-foreground">{file.name}</p>
        <p className="flex items-center gap-1 text-xs text-success">
          <CircleCheck aria-hidden className="size-3.5" />
          <span>{t("attachedLabel")}</span>
          <span className="font-latin text-muted-foreground tabular-nums">· {describeFile(file)}</span>
        </p>
      </div>
      <Button
        aria-label={t("removeProof", { name: file.name })}
        className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

/** Figma "Advisor Onboarding - Stage 3" (995:6341) and its missing-proof state (995:6544). */
export function OnboardingStage3Screen() {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const draft = useOnboardingDraft();
  const skills = useResource<Paginated<ApiNamedRecord>>(
    "skills",
    useCallback((signal: AbortSignal) => listSkills(signal), []),
  );
  const skillOptions = skills.data?.items ?? [];
  const listId = useId();
  const [problem, setProblem] = useState<SubmitProblem | null>(null);
  const [refused, setRefused] = useState<Readonly<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const missing = problem?.kind === "missing";

  const complete = draft.skills.filter(
    (s) => skillOptions.some((skill) => skill.name === s.skill.trim()) && heldFile(s.id),
  ).length;
  const progress = complete / Math.max(1, draft.skills.length);

  function setSkill(id: string, patch: Partial<{ skill: string; proof: string | null }>) {
    updateDraft({ skills: draft.skills.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    setProblem(null);
  }

  function attach(id: string, file: File) {
    if (!isProofFile(file)) {
      setRefused((r) => ({ ...r, [id]: file.name }));
      return;
    }
    setRefused((r) => {
      const rest = { ...r };
      delete rest[id];
      return rest;
    });
    holdFile(id, file);
    setSkill(id, { proof: file.name });
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    const found = await sendApplication(draft, skillOptions);
    setBusy(false);
    setProblem(found);
    if (found) return;
    invalidate("advisors/me");
    clearDraft();
    router.push("/advisor-onboarding/thank-you");
  }

  return (
    <OnboardingSplit
      actions={
        <StageActions
          backHref="/advisor-onboarding/stage-2"
          backLabel={c("back")}
          note={<p className={cn("hidden text-muted-foreground md:block", NOTE)}>{t("submitNote")}</p>}
        >
          <Button
            aria-busy={busy || undefined}
            className={NEXT}
            disabled={busy || !draft.skills.some((s) => s.skill.trim())}
            onClick={() => void submit()}
            type="button"
          >
            {busy ? t("submitting") : t("submitReview")}
          </Button>
        </StageActions>
      }
    >
      <ApplicationStepper progress={progress} step={3} />
      <StageBody>
        <StageHeading lead={t("s3Intro")} title={t("s3Title")} />

        {problem ? <SubmitBanner problem={problem} /> : null}

        <datalist id={listId}>
          {skillOptions.map((skill) => (
            <option key={skill.id} value={skill.name} />
          ))}
        </datalist>

        {/* Figma "Skill Card": the skill, then its proof, one card each. */}
        <div className="flex flex-col gap-4">
          {draft.skills.map((entry, index) => {
            // A name with no file behind it (the tab was reloaded) is no proof.
            const file = entry.proof ? heldFile(entry.id) : undefined;
            const lost = entry.proof && !file ? entry.proof : null;
            const named = entry.skill.trim();
            const unknown = problem?.kind === "unknown" && problem.skill === named;
            const noSkill = missing && !named;
            const noProof = missing && !file;
            return (
              <section
                aria-label={named || t("skillCardN", { n: index + 1 })}
                className={cn(
                  "flex flex-col gap-4 rounded-card border bg-card p-4 shadow-hero-card",
                  noSkill || noProof || unknown ? "border-destructive" : "border-hero-card-border",
                )}
                key={entry.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2
                    className={cn(
                      "truncate text-sm font-semibold md:text-base",
                      named ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {named || t("skillNew")}
                  </h2>
                  <Button
                    aria-label={t("removeSkill")}
                    className="-my-2 -mr-2 size-11 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                    disabled={draft.skills.length === 1}
                    onClick={() => {
                      dropFile(entry.id);
                      updateDraft({ skills: draft.skills.filter((s) => s.id !== entry.id) });
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden className="size-4.5" />
                  </Button>
                </div>
                <ApplicationField
                  autoComplete="off"
                  error={(unknown && t("unknownSkillField")) || (noSkill && t("skillMissing")) || undefined}
                  icon={Search}
                  id={`skill-${entry.id}`}
                  label={t("skillLabel")}
                  list={listId}
                  onChange={(event) => setSkill(entry.id, { skill: event.target.value })}
                  placeholder={t("skillPlaceholder")}
                  value={entry.skill}
                />
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground md:text-base">{t("proofLabel")}</p>
                  {file ? (
                    <AttachedProof
                      file={file}
                      onRemove={() => {
                        dropFile(entry.id);
                        setSkill(entry.id, { proof: null });
                      }}
                    />
                  ) : (
                    <DocumentDrop
                      accept={PROOF_TYPES}
                      compact
                      icon={FileText}
                      invalid={noProof || Boolean(refused[entry.id])}
                      onPick={(picked) => attach(entry.id, picked)}
                      pickLabel={t("proofBrowse")}
                      rule={t("proofRule")}
                      title={t("proofHint")}
                    />
                  )}
                  {refused[entry.id] ? (
                    <p className={cn("text-destructive", NOTE)} role="alert">
                      {t("proofRefused", { name: refused[entry.id] })}
                    </p>
                  ) : null}
                  {noProof && !refused[entry.id] ? (
                    <p className={cn("text-destructive", NOTE)}>{t("proofMissing")}</p>
                  ) : null}
                  {lost ? <p className={cn("text-muted-foreground", NOTE)}>{t("proofLost", { name: lost })}</p> : null}
                </div>
              </section>
            );
          })}
          <Button
            className={cn(PICK, "w-full border-dashed md:w-auto md:self-start")}
            onClick={() =>
              updateDraft({
                skills: [...draft.skills, { id: `skill-${Date.now()}`, skill: "", proof: null }],
              })
            }
            type="button"
            variant="outline"
          >
            <Plus aria-hidden />
            {t("addSkill")}
          </Button>
        </div>
        <p className={cn("text-muted-foreground md:hidden", NOTE)}>{t("submitNote")}</p>
      </StageBody>
    </OnboardingSplit>
  );
}
