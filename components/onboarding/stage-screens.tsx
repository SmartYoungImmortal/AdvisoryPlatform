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
import { SiteFooter } from "@/components/marketing/site-footer";
import { FilePickButton } from "@/components/onboarding/file-pick";
import { BulletLine, CheckLine, DropZone, StageHeader } from "@/components/onboarding/parts";
import { Surface, SurfaceList } from "@/components/mobile/surface";
import { StackRow } from "@/components/screening/parts";
import { TopBar } from "@/components/topbar";
import { PAGE, READING_COLUMN } from "@/lib/layout";
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

/**
 * Figma "Back Bar" (1787:24447) — the 52px row the desktop onboarding frames put
 * under the app's nav: the same chevron the phone frame carries, re-seated on the
 * card surface at the 120px page inset. It is the phone's own top bar with `lg:`
 * metrics, not a second control.
 */
const BACK_BAR = "lg:h-13 lg:bg-card lg:pt-0 lg:pb-0 lg:pl-10 xl:pl-30";

/**
 * Figma "Step Band" / "Head Band" — the white band that holds the heading above
 * the grey form band, with the content in the same 800px column as the card.
 */
const HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card lg:pb-8";

/**
 * The 800px column the band's heading and the card below it both sit in — the
 * reading measure from `lib/layout`, which is where 800 is decided.
 */
const COLUMN = cn(READING_COLUMN, "lg:px-0");

/**
 * Figma "Card" (1787:24374) — the 800px panel every stage's form becomes at 1440:
 * a 40px inset on the card surface, 48px clear of the band above it.
 *
 * On the phone the form is the screen itself, so this is a set of `lg:` classes
 * spread onto the block that already holds it rather than a wrapper of its own.
 *
 * `--shadow-panel` because that is what it is: a sheet floating on the grey band
 * under the white step band. With a hairline alone the two bands read as one
 * surface with a line drawn across it.
 */
const FORM_CARD = cn(
  "flex w-full flex-1 flex-col lg:my-12 lg:flex-none lg:gap-6 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-10 lg:shadow-panel",
  READING_COLUMN,
);

/** Figma "Actions" — the stage button stops filling the width and holds the end. */
const CARD_ACTIONS = "lg:items-end lg:px-0 lg:pt-2 lg:pb-0";
const CARD_ACTION_BUTTON = "lg:h-11 lg:w-50";

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

  // One list, drawn twice: as the phone's hairline-separated card rows, and as
  // Figma "Cards" (1787:24292) — three 384px panels across the 1200 column. The
  // desktop panel stacks a 48px icon box over its title, which `StackRow`'s fixed
  // 64px row cannot become, so the two shapes are spelled out against one source
  // rather than letting the copy drift between them.
  const promises = [
    { icon: BadgeCheck, title: t("verifyTitle"), body: t("verifyBody") },
    { icon: CalendarDays, title: t("scheduleTitle"), body: t("scheduleBody") },
    { icon: Wallet, title: t("earnTitle"), body: t("earnBody") },
  ];

  // The phone frame ends on these; the desktop frame opens on them, under the
  // hero. Same pair either way, so it is written once and placed twice.
  const actions = (
    <>
      {isAdvisor ? (
        <PrimaryButton className={CARD_ACTION_BUTTON} href="/work">
          {t("goToWork")}
        </PrimaryButton>
      ) : (
        <PrimaryButton className={CARD_ACTION_BUTTON} href={startHref}>
          {application ? t("seeStatus") : t("start")}
        </PrimaryButton>
      )}
      {/* Both actions take the same 44px height at `lg`: the secondary was left
          at 36 and the pair sat on one line at two different heights. */}
      <NeutralButton className={CARD_ACTION_BUTTON} href="/profile">
        {t("later")}
      </NeutralButton>
    </>
  );

  return (
    // Figma "Desktop / Become an advisor (Light)" (1787:24258): the phone frame's
    // heading becomes a centred hero band, its card becomes three panels on the
    // grey ground below, and the page closes on the site footer.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className={BACK_BAR} href="/profile" label={c("back")} />
      <ScreenBody>
        {/* Figma "Hero" (1787:24284) — a 760px column, centred, 40/60 over a
            line of body and the two actions side by side. */}
        <div className={cn(HEAD_BAND, "lg:pt-16 lg:pb-14")}>
          <ScreenHeading
            className="gap-2 pt-4 lg:mx-auto lg:w-[760px] lg:items-center lg:gap-4 lg:px-0 lg:pt-0 lg:pb-0 lg:text-center [&_h1]:lg:text-display [&_p]:lg:text-base"
            subtitle={t("introSubtitle")}
            title={t("introTitle")}
          />
          <ScreenActions className="hidden lg:mx-auto lg:flex lg:w-[392px] lg:flex-row lg:items-center lg:gap-3 lg:px-0 lg:pt-8 lg:pb-0">
            {actions}
          </ScreenActions>
        </div>

        {/* Figma "What We Use" (1787:24291) — the same three promises on the
            grey band, one 384px panel each. */}
        <div className={cn("flex w-full shrink-0 flex-col items-start px-6 pt-3 lg:pt-18 lg:pb-22", PAGE)}>
          {/* One card with hairlines between its rows, which is what the
              `Card` + `CardDivider` + `Fragment` stack was drawing by hand. */}
          <SurfaceList className="lg:hidden">
            {promises.map(({ icon, title, body }) => (
              <StackRow body={body} icon={icon} key={title} title={title} />
            ))}
          </SurfaceList>
          <div className="hidden w-full lg:grid lg:grid-cols-3 lg:gap-6">
            {promises.map(({ icon: Icon, title, body }) => (
              <Surface className="flex flex-col items-start p-7" key={title}>
                {/* The chip takes the accent as a *status* ground: three grey
                    squares on a grey band was the flattest block on the page,
                    and these three panels are the pitch. */}
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent-surface">
                  <Icon className="size-5.5 text-primary" />
                </span>
                {/* `leading-7` is what `text-lg` now resolves to. */}
                <p className="w-full pt-3.5 text-lg font-semibold text-foreground">
                  {title}
                </p>
                <p className="w-full pt-3.5 text-sm font-normal text-muted-foreground">
                  {body}
                </p>
              </Surface>
            ))}
          </div>
        </div>

        {/* The phone frame pins its actions to the bottom edge; the desktop hero
            already carries them, so the spacer and the stack stop at `lg`. */}
        <ScreenSpacer className="lg:hidden" />
        <ScreenActions className="lg:hidden">{actions}</ScreenActions>

        <SiteFooter className="mt-auto hidden lg:flex" />
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
    // Figma "Desktop / Advisor onboarding - Stage 1 (Light)" (1787:24342): the
    // track and title become a white step band, and the form becomes an 800px
    // card on the grey ground — two fields to a row, the action holding the end.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className={BACK_BAR} href="/advisor/apply" label={c("back")} />
      <ScreenBody>
        <div className={HEAD_BAND}>
          <StageHeader
            className={cn(COLUMN, "lg:pt-7")}
            label={t("stepOf", { n: 1 })}
            step={1}
            title={t("s1Title")}
          />
        </div>

        <div className={FORM_CARD}>
        {failed ? (
          <AlertBanner
            body={t("s1ErrorBody")}
            className="lg:px-0 lg:pt-0"
            icon={TriangleAlert}
            title={t("s1ErrorTitle")}
          />
        ) : null}

        {/* Figma "Identity Row" / "Birth Row" — 350px fields, 20px apart, with
            the bio spanning both. The phone stacks the same five. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-2 lg:grid lg:grid-cols-2 lg:gap-x-5 lg:gap-y-6 lg:px-0 lg:pt-0">
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
          <div className="flex w-full shrink-0 flex-col items-start gap-1.5 lg:col-span-2">
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

        <ScreenSpacer className="lg:hidden" />
        <div className={cn("flex w-full shrink-0 flex-col items-center px-6 pb-2", CARD_ACTIONS)}>
          <PrimaryButton
            className={cn("disabled:opacity-40", CARD_ACTION_BUTTON)}
            disabled={!draft.legalName.trim() || !draft.phone.trim() || !draft.birthDate.trim()}
            onClick={next}
          >
            {t("continue")}
          </PrimaryButton>
        </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
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
    // Figma "Desktop / Advisor onboarding - Stage 2 (Light)" (1787:24424) and its
    // uploaded (1787:24512) and rejected (1787:24772) states: the same card, with
    // the document on the left of a 344/344 split and the guidance beside it.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className={BACK_BAR} href="/advisor-onboarding/stage-1" label={c("back")} />
      <ScreenBody>
        <div className={HEAD_BAND}>
          <StageHeader
            className={cn(COLUMN, "lg:pt-7")}
            label={t("stepOf", { n: 2 })}
            step={2}
            title={t("s2Title")}
          />
        </div>

        <div className={FORM_CARD}>
        {rejected ? (
          <AlertBanner
            body={t("s2ErrorBody")}
            className="lg:px-0 lg:pt-0"
            icon={TriangleAlert}
            title={t("s2ErrorTitle")}
          />
        ) : null}

        {/* Figma "Split" (1787:24457) — the document and what to check about it
            side by side, where the phone can only stack them. */}
        <div className="contents lg:grid lg:w-full lg:grid-cols-2 lg:items-start lg:gap-8">
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2 lg:px-0 lg:pt-0">
          {uploaded ? (
            /* Figma "Uploaded Document" (402 x 262): a 354 x 208 preview, a 10px
               gap, then the 36px file-info row; the actions row follows 12px down. */
            <>
              <Image
                alt={fileName}
                className="h-[208px] w-full shrink-0 rounded-card border border-border object-cover"
                src={idCard}
              />
              {/* The file's name, size and accepted-ness, as one chip in a well
                  rather than three loose elements under the preview. The check
                  goes green: it is a status, and it was the accent blue — the
                  same colour as the page's actions. */}
              <Surface className="mt-2.5 flex w-full items-center gap-2.5 p-3" tier="well">
                <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
                  <p className="font-latin w-full truncate text-sm font-medium text-foreground">
                    {fileName}
                  </p>
                  <p className="font-latin w-full text-xs font-normal tabular-nums text-muted-foreground">
                    {t("fileMeta")}
                  </p>
                </div>
                <CircleCheck className="size-5 shrink-0 text-success" />
              </Surface>
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

        {/* Figma guidance / next-steps list. It is the right half of the desktop
            split and a loose block under the dropzone on the phone, so it takes a
            surface of its own: raised against the page ground, hairline-only
            inside the form card at `lg`. */}
        <div className={cn("flex w-full shrink-0 flex-col items-start px-6 lg:px-0 lg:pt-0", uploaded ? "pt-6" : "pt-5")}>
          <Surface className="flex w-full flex-col items-start gap-1.5 p-3.5 lg:shadow-none">
            <p className="mb-0.5 w-full text-base font-semibold text-foreground lg:text-lg">
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
          </Surface>
        </div>
        </div>

        <ScreenSpacer className="lg:hidden" />
        <div className={cn("flex w-full shrink-0 flex-col items-center px-6 pb-2", CARD_ACTIONS)}>
          <PrimaryButton
            className={cn("disabled:opacity-40", CARD_ACTION_BUTTON)}
            disabled={!uploaded}
            onClick={() => {
              if (!draft.idFileName && fileName) updateDraft({ idFileName: fileName });
              router.push("/advisor-onboarding/stage-3");
            }}
          >
            {t("continue")}
          </PrimaryButton>
        </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
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
    // Figma "Desktop / Advisor onboarding - Stage 3 (Light)" (1787:24606) and the
    // missing-proof state (1787:24866): the intro line moves up into the step
    // band, and the skill cards fill the 800px card below it.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className={BACK_BAR} href="/advisor-onboarding/stage-2" label={c("back")} />
      <ScreenBody>
        <div className={HEAD_BAND}>
          <StageHeader
            className={cn(COLUMN, "lg:pt-7")}
            label={t("stepOf", { n: 3 })}
            step={3}
            subtitle={t("s3Intro")}
            title={t("s3Title")}
          />
        </div>

        <div className={FORM_CARD}>
        {missing ? (
          <AlertBanner
            body={t("s3ErrorBody")}
            className="lg:px-0 lg:pt-0"
            icon={TriangleAlert}
            title={t("s3ErrorTitle")}
          />
        ) : null}

        {/* The desktop step band already carries this line. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2 lg:hidden">
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
        <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6 pt-4 lg:px-0 lg:pt-0 lg:pb-1">
          {draft.skills.map((entry, index) => {
            const invalid = missing && (!entry.proof || !entry.skill.trim());
            return (
              // It was a `border-transparent` card on the surface it sat on —
              // that is, nothing at all, on the phone and inside the form card
              // alike. It is a card: hairline and resting lift on the page
              // ground, hairline only inside the 800 card, and the destructive
              // edge when its proof is missing.
              <Surface
                className={cn(
                  "flex w-full flex-col items-start gap-3 p-3.5 lg:shadow-none",
                  invalid && "border-destructive",
                )}
                key={entry.id}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <p className="text-base font-semibold text-foreground">
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
                    /* A file inside the skill card belongs under its surface, not
                       level with it — and the check is a status, so it is green. */
                    <Surface
                      className="flex w-full items-center gap-2.5 p-3"
                      tier="well"
                    >
                      <FileCheck className="size-5 shrink-0 text-success" />
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
                    </Surface>
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
              </Surface>
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

        <ScreenSpacer className="lg:hidden" />
        <div className={cn("flex w-full shrink-0 flex-col items-center px-6 pt-4 pb-2", CARD_ACTIONS)}>
          <PrimaryButton
            className={cn("disabled:opacity-40", CARD_ACTION_BUTTON)}
            disabled={!draft.skills.some((s) => s.skill.trim())}
            onClick={submit}
          >
            {t("submitReview")}
          </PrimaryButton>
        </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
