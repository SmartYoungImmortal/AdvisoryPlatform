"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ChevronsUpDown,
  CircleCheck,
  FileCheck,
  IdCard,
  ImageUp,
  Phone,
  Plus,
  Trash2,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { thaiNationalId as idCard } from "@/lib/assets/r2";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { FilePickButton } from "@/components/onboarding/file-pick";
import { BulletLine, CheckLine, DropZone, StageHeader } from "@/components/onboarding/parts";
import { Card, CardDivider, StackRow } from "@/components/screening/parts";
import { submitAdvisorApplication } from "@/lib/mock-db/actions";
import { useDatabase } from "@/lib/mock-db/store";
import { useSession } from "@/lib/session";
import {
  clearDraft,
  isThaiPhone,
  parseBirthDate,
  updateDraft,
  useOnboardingDraft,
} from "@/lib/session/onboarding";
import { cn } from "@/lib/utils";

/** The signed-in account's latest application, if it has one. */
function useLatestApplication() {
  const session = useSession();
  const accountId = session.status === "authenticated" ? session.account.id : null;
  return useDatabase((db) =>
    accountId ? db.identityRequests.find((r) => r.accountId === accountId) : undefined,
  );
}

/**
 * Figma "Become an advisor (Light)" — 995:6410. An applicant with a request on
 * file is sent to its status instead of into a second application.
 */
export function BecomeAdvisorScreen() {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const session = useSession();
  const application = useLatestApplication();
  const isAdvisor = session.status === "authenticated" && session.account.role === "advisor";
  const startHref = application ? "/advisor-onboarding/pending" : "/advisor-onboarding/stage-1";

  return (
    <MobileScreen>
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody>
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("introSubtitle")}
          title={t("introTitle")}
        />
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <Card>
            <StackRow body={t("verifyBody")} icon={BadgeCheck} title={t("verifyTitle")} />
            <CardDivider />
            <StackRow body={t("scheduleBody")} icon={CalendarDays} title={t("scheduleTitle")} />
            <CardDivider />
            <StackRow body={t("earnBody")} icon={Wallet} title={t("earnTitle")} />
          </Card>
        </div>
        <ScreenSpacer />
        <ScreenActions>
          {isAdvisor ? (
            <PrimaryButton href="/work">{t("goToWork")}</PrimaryButton>
          ) : (
            <PrimaryButton href={startHref}>
              {application ? t("seeStatus") : t("start")}
            </PrimaryButton>
          )}
          <NeutralButton href="/profile">{t("later")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Advisor Onboarding - Stage 1" (995:6215) and its error state (995:6452). */
export function OnboardingStage1Screen({
  state = "default",
}: {
  readonly state?: "default" | "errors";
}) {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const draft = useOnboardingDraft();
  const preset = state === "errors";
  const [phonePreset] = useState(preset ? t("phoneFilled") : null);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; dob?: string }>(() =>
    preset
      ? { name: t("legalNameError"), phone: t("phoneError"), dob: t("dobError") }
      : {},
  );
  const phone = phonePreset !== null && draft.phone === "" ? phonePreset : draft.phone;
  const failed = Boolean(errors.name || errors.phone || errors.dob);

  function next() {
    const found: typeof errors = {};
    if (draft.legalName.trim().split(/\s+/).length < 2) found.name = t("legalNameError");
    if (!isThaiPhone(draft.phone)) found.phone = t("phoneError");
    if (!draft.birthDate.trim()) found.dob = t("dobError");
    else if (!parseBirthDate(draft.birthDate)) found.dob = t("dobFormatError");
    setErrors(found);
    if (Object.keys(found).length === 0) router.push("/advisor-onboarding/stage-2");
  }

  return (
    <MobileScreen>
      <ScreenTopBar href="/advisor/apply" label={c("back")} />
      <ScreenBody>
        <StageHeader label={t("stepOf", { n: 1 })} step={1} title={t("s1Title")} />

        {failed ? (
          <AlertBanner
            body={t("s1ErrorBody")}
            icon={TriangleAlert}
            title={t("s1ErrorTitle")}
          />
        ) : null}

        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-2">
          <Field
            autoComplete="name"
            error={errors.name}
            id="ob-name"
            invalid={Boolean(errors.name)}
            label={failed ? t("fullNameLabel") : t("legalNameLabel")}
            onChange={(event) => {
              updateDraft({ legalName: event.target.value });
              setErrors((e) => ({ ...e, name: undefined }));
            }}
            placeholder={failed ? t("fullNamePlaceholder") : t("legalNamePlaceholder")}
            value={draft.legalName}
          />
          <Field
            autoComplete="tel"
            error={errors.phone}
            icon={Phone}
            id="ob-phone"
            inputMode="tel"
            invalid={Boolean(errors.phone)}
            label={t("phoneLabel")}
            latin
            onChange={(event) => {
              updateDraft({ phone: event.target.value });
              setErrors((e) => ({ ...e, phone: undefined }));
            }}
            placeholder={t("phonePlaceholder")}
            value={phone}
          />
          <Field
            error={errors.dob}
            icon={CalendarDays}
            id="ob-dob"
            inputMode="numeric"
            invalid={Boolean(errors.dob)}
            label={t("dobLabel")}
            latin
            onChange={(event) => {
              updateDraft({ birthDate: event.target.value });
              setErrors((e) => ({ ...e, dob: undefined }));
            }}
            placeholder={failed ? t("dobFilledPlaceholder") : t("dobPlaceholder")}
            value={draft.birthDate}
          />
          <div className="flex w-full shrink-0 flex-col items-start gap-1.5">
            <label
              className="w-full text-sm font-medium text-foreground"
              htmlFor="ob-bio"
            >
              {failed ? t("bioIntroLabel") : t("bioLabel")}
            </label>
            <Textarea
              className="h-21 resize-none bg-muted px-3 text-sm shadow-none field-sizing-fixed"
              id="ob-bio"
              onChange={(event) => updateDraft({ bio: event.target.value })}
              placeholder={t("bioPlaceholder")}
              value={draft.bio}
            />
            <p className="w-full text-xs font-normal text-muted-foreground">
              {t("bioHint")}
            </p>
          </div>
        </div>

        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <PrimaryButton
            className="disabled:opacity-40"
            disabled={!draft.legalName.trim() || !draft.phone.trim() || !draft.birthDate.trim()}
            onClick={next}
          >
            {t("continue")}
          </PrimaryButton>
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}

const IMAGE_TYPES = "image/jpeg,image/png";

/**
 * Figma "Advisor Onboarding - Stage 2" (995:6250), its uploaded state (995:6292)
 * and its rejected state (995:6496).
 */
export function OnboardingStage2Screen({
  state = "default",
}: {
  readonly state?: "default" | "uploaded" | "rejected";
}) {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const draft = useOnboardingDraft();
  const [rejected, setRejected] = useState(state === "rejected");
  const fileName = draft.idFileName ?? (state === "uploaded" ? t("fileName") : null);
  const uploaded = fileName !== null;

  function pick(name: string) {
    // The frame's rejection is about format; anything but JPG/PNG gets it.
    if (!/\.(jpe?g|png)$/i.test(name)) {
      setRejected(true);
      updateDraft({ idFileName: null });
      return;
    }
    setRejected(false);
    updateDraft({ idFileName: name });
  }

  const browse = (
    <FilePickButton accept={IMAGE_TYPES} className="mt-3" onPick={pick}>
      <ImageUp className="size-4" />
      {t("browse")}
    </FilePickButton>
  );

  return (
    <MobileScreen>
      <ScreenTopBar href="/advisor-onboarding/stage-1" label={c("back")} />
      <ScreenBody>
        <StageHeader label={t("stepOf", { n: 2 })} step={2} title={t("s2Title")} />

        {rejected ? (
          <AlertBanner
            body={t("s2ErrorBody")}
            icon={TriangleAlert}
            title={t("s2ErrorTitle")}
          />
        ) : null}

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          {uploaded ? (
            /* Figma "Uploaded Document" (402 x 262): a 354 x 208 preview, a 10px
               gap, then the 36px file-info row; the actions row follows 12px down. */
            <>
              <Image
                alt={fileName}
                className="h-[208px] w-full shrink-0 rounded-xl object-cover"
                src={idCard}
              />
              <div className="mt-2.5 flex h-9 w-full shrink-0 items-start gap-2.5">
                <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
                  <p className="font-latin w-full truncate text-sm font-medium text-foreground">
                    {fileName}
                  </p>
                  <p className="font-latin w-full text-xs leading-3.5 font-normal text-muted-foreground">
                    {t("fileMeta")}
                  </p>
                </div>
                <CircleCheck className="mt-2 size-5 shrink-0 text-primary" />
              </div>
              <div className="mt-3 flex w-full shrink-0 items-center gap-3">
                <FilePickButton accept={IMAGE_TYPES} className="min-w-px flex-1" onPick={pick}>
                  <ImageUp className="size-4" />
                  {t("replace")}
                </FilePickButton>
                <NeutralButton
                  className="min-w-px flex-1 border-destructive text-destructive"
                  onClick={() => updateDraft({ idFileName: null })}
                >
                  <Trash2 className="size-4" />
                  {t("remove")}
                </NeutralButton>
              </div>
            </>
          ) : (
            <DropZone
              action={browse}
              icon={IdCard}
              invalid={rejected}
              subtitle={t("uploadSubtitle")}
              title={t("uploadTitle")}
            />
          )}
        </div>

        {/* Figma guidance / next-steps list. */}
        <div className={cn("flex w-full shrink-0 flex-col items-start gap-1.5 px-6", uploaded ? "pt-6" : "pt-5")}>
          <p className="mb-0.5 w-full text-sm font-medium text-foreground">
            {uploaded ? t("nextHeading") : t("guidance")}
          </p>
          {uploaded ? (
            <>
              <BulletLine>{t("next1")}</BulletLine>
              <BulletLine>{t("next2")}</BulletLine>
            </>
          ) : (
            <>
              <CheckLine>{t("check1")}</CheckLine>
              <CheckLine>{t("check2")}</CheckLine>
              <CheckLine>{t("check3")}</CheckLine>
            </>
          )}
        </div>

        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <PrimaryButton
            className="disabled:opacity-40"
            disabled={!uploaded}
            onClick={() => {
              if (!draft.idFileName && fileName) updateDraft({ idFileName: fileName });
              router.push("/advisor-onboarding/stage-3");
            }}
          >
            {t("continue")}
          </PrimaryButton>
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}

const PROOF_TYPES = "image/jpeg,image/png,application/pdf";

/** Figma "Advisor Onboarding - Stage 3" (995:6341) and its missing-proof state (995:6544). */
export function OnboardingStage3Screen({
  state = "default",
}: {
  readonly state?: "default" | "missing-proof";
}) {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const router = useRouter();
  const session = useSession();
  const draft = useOnboardingDraft();
  const skillOptions = useDatabase((db) => db.skills);
  const categories = useDatabase((db) => db.categories);
  const listId = useId();
  const [missing, setMissing] = useState(state === "missing-proof");

  function setSkill(id: string, patch: Partial<{ skill: string; proof: string | null }>) {
    updateDraft({ skills: draft.skills.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    setMissing(false);
  }

  function submit() {
    const filled = draft.skills.filter((s) => s.skill.trim());
    if (filled.length === 0 || filled.some((s) => !s.proof)) {
      setMissing(true);
      return;
    }
    if (session.status !== "authenticated") return;
    const account = session.account;
    const lead = filled[0]?.skill.trim() ?? "";
    // The field is the lead skill's category when it is one the catalogue knows.
    const known = skillOptions.find((s) => s.name === lead);
    const field = categories.find((cat) => cat.id === known?.categoryId)?.name ?? lead;
    submitAdvisorApplication(account.id, {
      fullName: draft.legalName.trim() || account.fullName,
      phone: draft.phone.trim(),
      birthDate: parseBirthDate(draft.birthDate) ?? "1990-01-01",
      // The number is read off the uploaded card during review; the form never asks.
      nationalIdLast4: "",
      field,
      credential: lead,
      skills: filled.map((s) => ({ skill: s.skill.trim(), documentName: s.proof ?? "" })),
    });
    clearDraft();
    router.push("/advisor-onboarding/thank-you");
  }

  return (
    <MobileScreen>
      <ScreenTopBar href="/advisor-onboarding/stage-2" label={c("back")} />
      <ScreenBody>
        <StageHeader label={t("stepOf", { n: 3 })} step={3} title={t("s3Title")} />

        {missing ? (
          <AlertBanner
            body={t("s3ErrorBody")}
            icon={TriangleAlert}
            title={t("s3ErrorTitle")}
          />
        ) : null}

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("s3Intro")}
          </p>
        </div>

        <datalist id={listId}>
          {skillOptions.map((skill) => (
            <option key={skill.id} value={skill.name} />
          ))}
        </datalist>

        {/* Figma "Skill Card": skill picker plus a proof drop zone, one per skill. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6 pt-4">
          {draft.skills.map((entry, index) => {
            const invalid = missing && (!entry.proof || !entry.skill.trim());
            return (
              <div
                className={cn(
                  "flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl border bg-card p-3.5",
                  invalid ? "border-destructive" : "border-transparent",
                )}
                key={entry.id}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">
                    {t("skillCardN", { n: index + 1 })}
                  </p>
                  <Button
                    aria-label={t("removeSkill")}
                    className="size-7 text-muted-foreground"
                    disabled={draft.skills.length === 1}
                    onClick={() =>
                      updateDraft({ skills: draft.skills.filter((s) => s.id !== entry.id) })
                    }
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Field
                  icon={ChevronsUpDown}
                  id={`skill-${entry.id}`}
                  label={t("skillLabel")}
                  list={listId}
                  onChange={(event) => setSkill(entry.id, { skill: event.target.value })}
                  placeholder={t("skillPlaceholder")}
                  value={entry.skill}
                />
                <div className="flex w-full shrink-0 flex-col items-start gap-1.5">
                  <p className="w-full text-sm font-medium text-foreground">
                    {t("proofLabel")}
                  </p>
                  {entry.proof ? (
                    <div className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card p-3">
                      <FileCheck className="size-5 shrink-0 text-primary" />
                      <p className="min-w-px flex-1 truncate font-latin text-sm text-foreground">
                        {entry.proof}
                      </p>
                      <Button
                        aria-label={t("remove")}
                        className="size-7 text-muted-foreground"
                        onClick={() => setSkill(entry.id, { proof: null })}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <DropZone
                      action={
                        <FilePickButton
                          accept={PROOF_TYPES}
                          className="mt-2"
                          onPick={(name) => setSkill(entry.id, { proof: name })}
                        >
                          <ImageUp className="size-4" />
                          {t("proofBrowse")}
                        </FilePickButton>
                      }
                      compact
                      icon={ImageUp}
                      invalid={invalid}
                      subtitle={t("proofHint")}
                      title={t("proofLabel")}
                    />
                  )}
                </div>
              </div>
            );
          })}
          <NeutralButton
            onClick={() =>
              updateDraft({
                skills: [...draft.skills, { id: `skill-${Date.now()}`, skill: "", proof: null }],
              })
            }
          >
            <Plus className="size-4" />
            {t("addSkill")}
          </NeutralButton>
        </div>

        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pt-4 pb-2">
          <PrimaryButton
            className="disabled:opacity-40"
            disabled={!draft.skills.some((s) => s.skill.trim())}
            onClick={submit}
          >
            {t("submitReview")}
          </PrimaryButton>
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}
