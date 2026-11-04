"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Clock3,
  FileText,
  IdCard,
  ImageIcon,
  ImageUp,
  LockKeyhole,
  Phone,
  Plus,
  RotateCw,
  Search,
  Trash2,
  type LucideIcon,
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
  latestPerSkill,
  listOwnSkillProofs,
  submitIdentityDocument,
  submitSkillProof,
  updateAdvisorProfile,
  type ApiOwnSkillProof,
  type SkillProofReviewStatus,
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
          <output className={cn("absolute inset-0 flex items-center justify-center text-muted-foreground", NOTE)}>
            {t("preparing")}
          </output>
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
type DraftSkill = Draft["skills"][number];

/**
 * One card on stage 3. A returning applicant's skills already sent come first,
 * each as its latest proof stands (`latestPerSkill`), then the cards added here.
 */
type SkillCard =
  /** Under review or accepted: shown as it stands and never sent again; the API has no way to take it back. */
  | { readonly kind: "kept"; readonly proof: ApiOwnSkillProof }
  /** Turned down: a new file goes for the same skill, or the card comes off and the skill is not sent. */
  | { readonly kind: "redo"; readonly proof: ApiOwnSkillProof }
  /** Added here: a skill from the catalogue and its file. */
  | { readonly kind: "new"; readonly entry: DraftSkill };

/** A first application's one empty card, drawn while there is no other. */
const FIRST_CARD: DraftSkill = { id: "skill-1", skill: "", proof: null };

function skillCards(sent: readonly ApiOwnSkillProof[], draft: Draft): SkillCard[] {
  const onFile = latestPerSkill(sent).flatMap((proof): SkillCard[] => {
    if (proof.reviewStatus !== "REJECTED") return [{ kind: "kept", proof }];
    return draft.turnedDown[proof.skillId] === false ? [] : [{ kind: "redo", proof }];
  });
  const added = draft.skills.length > 0 || onFile.length > 0 ? draft.skills : [FIRST_CARD];
  return [...onFile, ...added.map((entry): SkillCard => ({ kind: "new", entry }))];
}

/** A card's key for its picked file (`holdFile`), its refused one, and React's list. */
function cardKey(card: SkillCard): string {
  return card.kind === "new" ? card.entry.id : `sent-${card.proof.skillId}`;
}

/** The name of the new proof picked for a card, kept in the draft while the file itself is held in memory. */
function pickedName(card: SkillCard, draft: Draft): string | null {
  switch (card.kind) {
    case "kept":
      return null;
    case "redo":
      return draft.turnedDown[card.proof.skillId] || null;
    case "new":
      return card.entry.proof;
  }
}

/** The new proof picked for a card, while the tab still holds it. */
function cardFile(card: SkillCard, draft: Draft): File | undefined {
  return pickedName(card, draft) ? heldFile(cardKey(card)) : undefined;
}

/**
 * Checks the cards against the catalogue and the files in memory, and returns
 * the proofs to send, one per turned-down or added skill, or the first thing
 * wrong. A skill under review or accepted sends nothing.
 */
function readyToSend(
  cards: readonly SkillCard[],
  draft: Draft,
  catalogue: readonly ApiNamedRecord[],
): { readonly proofs: ReadonlyArray<{ skillId: string; file: File }> } | SubmitProblem {
  if (!cards.some((card) => card.kind !== "new" || card.entry.skill.trim())) return { kind: "missing" };
  const proofs: { skillId: string; file: File }[] = [];
  for (const card of cards) {
    if (card.kind === "kept") continue;
    let skillId: string;
    if (card.kind === "redo") {
      skillId = card.proof.skillId;
    } else {
      const name = card.entry.skill.trim();
      if (!name) continue;
      const known = catalogue.find((skill) => skill.name === name);
      if (!known) return { kind: "unknown", skill: name };
      skillId = known.id;
    }
    const file = cardFile(card, draft);
    if (!file) return { kind: "missing" };
    proofs.push({ skillId, file });
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
async function sendApplication(
  cards: readonly SkillCard[],
  draft: Draft,
  catalogue: readonly ApiNamedRecord[],
): Promise<SubmitProblem | null> {
  const ready = readyToSend(cards, draft, catalogue);
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

/** A sent proof's review, in the words and inks of the application's status pages. */
const REVIEW = {
  PENDING: { label: "statusReviewing", ink: "text-primary", icon: Clock3 },
  APPROVED: { label: "statusApproved", ink: "text-success", icon: CircleCheck },
  REJECTED: { label: "statusNeedsFix", ink: "text-destructive", icon: CircleAlert },
} as const satisfies Record<SkillProofReviewStatus, { label: string; ink: string; icon: LucideIcon }>;

function ReviewStatus({ status }: { readonly status: SkillProofReviewStatus }) {
  const t = useTranslations("advisorOnboarding");
  const { label, ink, icon: Icon } = REVIEW[status];
  return (
    <span className={cn("flex shrink-0 items-center gap-1 font-medium", ink)}>
      <Icon aria-hidden className="size-3.5" />
      {t(label)}
    </span>
  );
}

/**
 * A proof inside its skill card: the file's name, a line on where it stands,
 * and, for a file only attached so far, the way to take it off.
 */
function ProofRow({
  name,
  status,
  onRemove,
}: {
  readonly name: string;
  readonly status: ReactNode;
  readonly onRemove?: () => void;
}) {
  const t = useTranslations("advisorOnboarding");
  const Icon = /\.pdf$/i.test(name) ? FileText : ImageIcon;
  return (
    <div
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-card bg-muted py-1.5 pl-3.5",
        onRemove ? "pr-1" : "pr-3.5",
      )}
    >
      <Icon aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-px flex-1 flex-col gap-0.5">
        <p className="truncate font-latin text-sm font-medium text-foreground">{name}</p>
        <p className="flex items-center gap-1 text-xs">{status}</p>
      </div>
      {onRemove ? (
        <Button
          aria-label={t("removeProof", { name })}
          className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

/** A picked file's line: attached, and how big it is. */
function AttachedStatus({ file }: { readonly file: File }) {
  const t = useTranslations("advisorOnboarding");
  return (
    <>
      <span className="flex items-center gap-1 text-success">
        <CircleCheck aria-hidden className="size-3.5" />
        {t("attachedLabel")}
      </span>
      <span className="font-latin text-muted-foreground tabular-nums">· {describeFile(file)}</span>
    </>
  );
}

/** What the review said of a turned-down proof, above the well for the one that replaces it. */
function RejectedProof({ proof }: { readonly proof: ApiOwnSkillProof }) {
  const t = useTranslations("advisorOnboarding");
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex min-w-0 items-center gap-1 text-xs">
        <ReviewStatus status="REJECTED" />
        <span className="min-w-0 truncate font-latin text-muted-foreground">· {proof.originalFileName}</span>
      </p>
      <p className={cn("text-foreground", NOTE)}>{proof.rejectionReason?.trim() || t("reviewerNoReason")}</p>
    </div>
  );
}

/** In place of the cards until the proofs sent before are read: that it is happening, or that it failed. */
function SentUnread({ error, onRetry }: { readonly error: Error | null; readonly onRetry: () => void }) {
  const t = useTranslations("advisorOnboarding");
  const e = useTranslations("errorStates");
  if (!error) return <output className={cn("text-muted-foreground", NOTE)}>{t("sentLoading")}</output>;
  return (
    <NoticeBanner title={t("sentFailedTitle")}>
      <p>{t("sentFailedBody")}</p>
      <Button className={cn(PICK, "mt-2.5")} onClick={onRetry} type="button" variant="outline">
        <RotateCw aria-hidden />
        {e("retry")}
      </Button>
    </NoticeBanner>
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
  // What a returning applicant sent before. Until it is read, nothing can be
  // sent: a skill already in the reviewers' queue would go into it twice.
  const sent = useResource<Paginated<ApiOwnSkillProof>>(
    "advisors/me/skill-proofs",
    useCallback((signal: AbortSignal) => listOwnSkillProofs(signal), []),
  );
  const skillOptions = skills.data?.items ?? [];
  const listId = useId();
  const [problem, setProblem] = useState<SubmitProblem | null>(null);
  const [refused, setRefused] = useState<Readonly<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const missing = problem?.kind === "missing";

  const cards = sent.data ? skillCards(sent.data.items, draft) : [];
  const added = cards.flatMap((card) => (card.kind === "new" ? [card.entry] : []));
  const catalogued = (entry: DraftSkill) => skillOptions.find((skill) => skill.name === entry.skill.trim());
  // A skill with a card of its own is not offered for an added card, and is refused on one.
  const onFile = new Set(cards.flatMap((card) => (card.kind === "new" ? [] : [card.proof.skillId])));
  const repeats = (entry: DraftSkill) => {
    const known = catalogued(entry);
    return known !== undefined && onFile.has(known.id);
  };
  const sendable =
    sent.data !== undefined &&
    !added.some(repeats) &&
    cards.some((card) => card.kind !== "new" || card.entry.skill.trim());

  const complete = cards.filter((card) => {
    if (card.kind === "kept") return true;
    if (!cardFile(card, draft)) return false;
    return card.kind === "redo" || catalogued(card.entry) !== undefined;
  }).length;
  const progress = complete / Math.max(1, cards.length);

  function setSkill(id: string, patch: Partial<{ skill: string; proof: string | null }>) {
    updateDraft({ skills: added.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    setProblem(null);
  }

  /** A turned-down skill's new file name, `false` to send the skill no more, `undefined` for nothing picked. */
  function setTurnedDown(skillId: string, value: string | false | undefined) {
    const next = { ...draft.turnedDown };
    if (value === undefined) delete next[skillId];
    else next[skillId] = value;
    updateDraft({ turnedDown: next });
    setProblem(null);
  }

  function setPicked(card: SkillCard, name: string | null) {
    if (card.kind === "redo") setTurnedDown(card.proof.skillId, name ?? undefined);
    else if (card.kind === "new") setSkill(card.entry.id, { proof: name });
  }

  function attach(card: SkillCard, file: File) {
    const key = cardKey(card);
    if (!isProofFile(file)) {
      setRefused((r) => ({ ...r, [key]: file.name }));
      return;
    }
    setRefused((r) => {
      const rest = { ...r };
      delete rest[key];
      return rest;
    });
    holdFile(key, file);
    setPicked(card, file.name);
  }

  function detach(card: SkillCard) {
    dropFile(cardKey(card));
    setPicked(card, null);
  }

  function removeCard(card: SkillCard) {
    dropFile(cardKey(card));
    if (card.kind === "redo") setTurnedDown(card.proof.skillId, false);
    else if (card.kind === "new") updateDraft({ skills: added.filter((s) => s.id !== card.entry.id) });
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    const found = await sendApplication(cards, draft, skillOptions);
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
            disabled={busy || !sendable}
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
          {skillOptions
            .filter((skill) => !onFile.has(skill.id))
            .map((skill) => (
              <option key={skill.id} value={skill.name} />
            ))}
        </datalist>

        {/* Figma "Skill Card": the skill, then its proof, one card each. */}
        <div className="flex flex-col gap-4">
          {sent.data === undefined ? <SentUnread error={sent.error} onRetry={sent.reload} /> : null}
          {cards.map((card, index) => {
            const key = cardKey(card);
            // A name with no file behind it (the tab was reloaded) is no proof.
            const picked = pickedName(card, draft);
            const file = cardFile(card, draft);
            const lost = picked && !file ? picked : null;
            const named = card.kind === "new" ? card.entry.skill.trim() : card.proof.skillName;
            const unknown = card.kind === "new" && problem?.kind === "unknown" && problem.skill === named;
            const repeated = card.kind === "new" && repeats(card.entry);
            const noSkill = missing && !named;
            const noProof = missing && card.kind !== "kept" && !file;
            return (
              <section
                aria-label={named || t("skillCardN", { n: index + 1 })}
                className={cn(
                  "flex flex-col gap-4 rounded-card border bg-card p-4 shadow-hero-card",
                  noSkill || noProof || unknown || repeated ? "border-destructive" : "border-hero-card-border",
                )}
                key={key}
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
                  {card.kind === "kept" ? null : (
                    <Button
                      aria-label={t("removeSkill")}
                      className="-my-2 -mr-2 size-11 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                      disabled={cards.length === 1}
                      onClick={() => removeCard(card)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden className="size-4.5" />
                    </Button>
                  )}
                </div>
                {card.kind === "new" ? (
                  <ApplicationField
                    autoComplete="off"
                    error={
                      (unknown && t("unknownSkillField")) ||
                      (repeated && t("skillAlreadySent")) ||
                      (noSkill && t("skillMissing")) ||
                      undefined
                    }
                    icon={Search}
                    id={`skill-${card.entry.id}`}
                    label={t("skillLabel")}
                    list={listId}
                    onChange={(event) => setSkill(card.entry.id, { skill: event.target.value })}
                    placeholder={t("skillPlaceholder")}
                    value={card.entry.skill}
                  />
                ) : null}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground md:text-base">{t("proofLabel")}</p>
                  {card.kind === "kept" ? (
                    <ProofRow name={card.proof.originalFileName} status={<ReviewStatus status={card.proof.reviewStatus} />} />
                  ) : (
                    <>
                      {card.kind === "redo" ? <RejectedProof proof={card.proof} /> : null}
                      {file ? (
                        <ProofRow name={file.name} onRemove={() => detach(card)} status={<AttachedStatus file={file} />} />
                      ) : (
                        <DocumentDrop
                          accept={PROOF_TYPES}
                          compact
                          icon={FileText}
                          invalid={noProof || Boolean(refused[key])}
                          onPick={(chosen) => attach(card, chosen)}
                          pickLabel={t("proofBrowse")}
                          rule={t("proofRule")}
                          title={t("proofHint")}
                        />
                      )}
                      {refused[key] ? (
                        <p className={cn("text-destructive", NOTE)} role="alert">
                          {t("proofRefused", { name: refused[key] })}
                        </p>
                      ) : null}
                      {noProof && !refused[key] ? (
                        <p className={cn("text-destructive", NOTE)}>{t("proofMissing")}</p>
                      ) : null}
                      {lost ? <p className={cn("text-muted-foreground", NOTE)}>{t("proofLost", { name: lost })}</p> : null}
                    </>
                  )}
                </div>
              </section>
            );
          })}
          {sent.data === undefined ? null : (
            <Button
              className={cn(PICK, "w-full border-dashed md:w-auto md:self-start")}
              onClick={() =>
                updateDraft({
                  skills: [...added, { id: `skill-${Date.now()}`, skill: "", proof: null }],
                })
              }
              type="button"
              variant="outline"
            >
              <Plus aria-hidden />
              {t("addSkill")}
            </Button>
          )}
        </div>
        <p className={cn("text-muted-foreground md:hidden", NOTE)}>{t("submitNote")}</p>
      </StageBody>
    </OnboardingSplit>
  );
}
