"use client";

import { ChevronRight, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenActions, ScreenBody, ScreenHeading, ScreenTopBar } from "@/components/mobile/screen";
import { surfaceClass } from "@/components/mobile/surface";
import { StatusToast, useStatusToast } from "@/components/mobile/toast";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FieldDescription, FieldError, FieldLabel, Field as FieldRoot } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getOwnAdvisorBackground,
  getOwnAdvisorProfile,
  replaceOwnAdvisorBackground,
  updateAdvisorProfile,
  type ApiOwnAdvisorProfile,
} from "@/lib/api/onboarding";
import type {
  ApiAdvisorBackground,
  ApiAdvisorCredential,
  ApiAdvisorEducation,
  ApiAdvisorExperience,
  ApiAdvisorLanguage,
  ApiLanguageProficiency,
} from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * `/advisor/edit` — what a client reads about the advisor, as the advisor
 * keeps it: the line under their name and their introduction
 * (`PATCH /advisors/me`), and the background their public profile's About
 * tab lists (`PUT /advisors/me/background`): work, education, languages,
 * licences and awards.
 *
 * Each list is edited here, an entry at a time in a small dialog, and the
 * whole page is saved at once, so nothing reaches the profile half done.
 * Years are typed the way the page's language counts them: Buddhist Era in
 * Thai (2565), and stored as the common era.
 */

/* ------------------------------------------------------------------ years */

/** The Buddhist Era runs 543 years ahead of the common era. */
const BE_OFFSET = 543;

/** A stored year as the reader types it. */
function shownYear(year: number | null, thai: boolean): string {
  if (year === null) return "";
  return String(thai ? year + BE_OFFSET : year);
}

/** A typed year as stored: a Buddhist Era year is taken back to the common era; nothing typed is null. */
function storedYear(typed: string, thai: boolean): number | null {
  const digits = typed.replace(/\D/g, "");
  if (!digits) return null;
  const year = Number(digits);
  return thai && year > 2400 ? year - BE_OFFSET : year;
}

/** Whether a stored year is one the API takes (1950 to 2100). */
function yearInRange(year: number | null): boolean {
  return year === null || (year >= 1950 && year <= 2100);
}

/* ----------------------------------------------------------------- fields */

/** The box every field here wears: the sign-up form's white box on a hairline. */
const FIELD_BOX = "h-11 rounded-xl border-accented bg-card px-4 text-base shadow-none md:h-12 md:text-base";

function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  inputMode,
  placeholder,
  className,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly hint?: string;
  readonly error?: string;
  readonly inputMode?: "numeric";
  readonly placeholder?: string;
  readonly className?: string;
}) {
  const note = `${id}-note`;
  return (
    <FieldRoot className={cn("gap-1.5", className)} data-invalid={error ? true : undefined}>
      <FieldLabel className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </FieldLabel>
      <Input
        aria-describedby={error || hint ? note : undefined}
        aria-invalid={error ? true : undefined}
        className={FIELD_BOX}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {error ? (
        <FieldError className="text-sm" id={note}>
          {error}
        </FieldError>
      ) : null}
      {!error && hint ? (
        <FieldDescription className="text-sm" id={note}>
          {hint}
        </FieldDescription>
      ) : null}
    </FieldRoot>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  hint,
  rows = 4,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly hint?: string;
  readonly rows?: number;
}) {
  return (
    <FieldRoot className="gap-1.5">
      <FieldLabel className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </FieldLabel>
      <Textarea
        className="min-h-24 rounded-xl border-accented bg-card px-4 py-3 text-base shadow-none field-sizing-content md:text-base"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
      {hint ? <FieldDescription className="text-sm">{hint}</FieldDescription> : null}
    </FieldRoot>
  );
}

function SelectField<K extends string>({
  id,
  label,
  value,
  onChange,
  items,
  placeholder,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: K | "";
  readonly onChange: (value: K) => void;
  readonly items: readonly { readonly value: K; readonly label: string }[];
  readonly placeholder?: string;
}) {
  return (
    <FieldRoot className="gap-1.5">
      <FieldLabel className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </FieldLabel>
      <Select items={items} onValueChange={(next) => onChange(next as K)} value={value || null}>
        <SelectTrigger className={cn(FIELD_BOX, "w-full justify-between data-[size=default]:h-11 md:data-[size=default]:h-12")} id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} sideOffset={6}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldRoot>
  );
}

/* ----------------------------------------------------------------- dialog */

/**
 * An entry's dialog, the settings' confirm card: its title in bold at the top
 * left, the fields flat on white, and the answers on one line at the right,
 * the way out as bare words and saving the entry as the capsule.
 */
function EntryDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  children,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly onSubmit: () => void;
  readonly children: ReactNode;
}) {
  const t = useTranslations("advisorEdit");
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl p-5 sm:max-w-[480px] md:p-6"
        overlayClassName="bg-scrim/40 supports-backdrop-filter:backdrop-blur-none"
        showCloseButton={false}
      >
        <form
          className="flex flex-col"
          noValidate
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <DialogTitle className="text-lg font-semibold text-foreground">{title}</DialogTitle>
          <div className="mt-5 flex flex-col gap-4">{children}</div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button className="h-11 px-4 text-sm font-medium" onClick={() => onOpenChange(false)} type="button" variant="ghost">
              {t("cancel")}
            </Button>
            <Button className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background hover:bg-foreground/85" type="submit">
              {t("done")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- entries */

type Experience = ApiAdvisorExperience;
type Education = ApiAdvisorEducation;
type Language = ApiAdvisorLanguage;
type Credential = ApiAdvisorCredential;

/** The twelve months by number, named in the page's language. */
function useMonths(): readonly { readonly value: string; readonly label: string }[] {
  const locale = useLocale();
  const name = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: name.format(new Date(2020, index, 1)) }));
}

/** A job being typed: every field as text, the way the form holds it. */
type ExperienceDraft = {
  title: string;
  organization: string;
  startMonth: string;
  startYear: string;
  current: boolean;
  endMonth: string;
  endYear: string;
  description: string;
};

function experienceDraft(entry: Experience | null, thai: boolean): ExperienceDraft {
  return {
    title: entry?.title ?? "",
    organization: entry?.organization ?? "",
    startMonth: entry?.startMonth ? String(entry.startMonth) : "",
    startYear: entry ? shownYear(entry.startYear, thai) : "",
    current: entry ? entry.endYear === null : true,
    endMonth: entry?.endMonth ? String(entry.endMonth) : "",
    endYear: entry ? shownYear(entry.endYear, thai) : "",
    description: entry?.description ?? "",
  };
}

function ExperienceDialog({
  entry,
  open,
  onOpenChange,
  onSave,
}: {
  readonly entry: Experience | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (entry: Experience) => void;
}) {
  const t = useTranslations("advisorEdit");
  const thai = useLocale() === "th";
  const months = useMonths();
  const [draft, setDraft] = useState(() => experienceDraft(entry, thai));
  const [errors, setErrors] = useState<Partial<Record<keyof ExperienceDraft, string>>>({});
  const set = <K extends keyof ExperienceDraft>(key: K, value: ExperienceDraft[K]) => setDraft((now) => ({ ...now, [key]: value }));

  const submit = () => {
    const found: Partial<Record<keyof ExperienceDraft, string>> = {};
    const startYear = storedYear(draft.startYear, thai);
    const endYear = draft.current ? null : storedYear(draft.endYear, thai);
    if (!draft.title.trim()) found.title = t("required");
    if (!draft.organization.trim()) found.organization = t("required");
    if (startYear === null || !yearInRange(startYear)) found.startYear = t("yearInvalid");
    if (!draft.current && (endYear === null || !yearInRange(endYear))) found.endYear = t("yearInvalid");
    if (startYear !== null && endYear !== null && endYear < startYear) found.endYear = t("endsBeforeStart");
    setErrors(found);
    if (Object.keys(found).length > 0 || startYear === null) return;
    onSave({
      title: draft.title.trim(),
      organization: draft.organization.trim(),
      startYear,
      startMonth: draft.startMonth ? Number(draft.startMonth) : null,
      endYear,
      endMonth: !draft.current && draft.endMonth ? Number(draft.endMonth) : null,
      description: draft.description.trim() || null,
    });
  };

  return (
    <EntryDialog onOpenChange={onOpenChange} onSubmit={submit} open={open} title={entry ? t("editExperience") : t("addExperience")}>
      <TextField error={errors.title} id="exp-title" label={t("jobTitle")} onChange={(value) => set("title", value)} value={draft.title} />
      <TextField
        error={errors.organization}
        hint={t("organizationHint")}
        id="exp-organization"
        label={t("organization")}
        onChange={(value) => set("organization", value)}
        value={draft.organization}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="exp-start-month"
          items={months}
          label={t("startMonth")}
          onChange={(value) => set("startMonth", value)}
          placeholder={t("monthOptional")}
          value={draft.startMonth}
        />
        <TextField
          error={errors.startYear}
          id="exp-start-year"
          inputMode="numeric"
          label={t("startYear")}
          onChange={(value) => set("startYear", value)}
          placeholder={t("yearExample")}
          value={draft.startYear}
        />
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-base text-foreground">
        <Checkbox checked={draft.current} onCheckedChange={(checked) => set("current", checked)} />
        {t("currentJob")}
      </label>
      {draft.current ? null : (
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            id="exp-end-month"
            items={months}
            label={t("endMonth")}
            onChange={(value) => set("endMonth", value)}
            placeholder={t("monthOptional")}
            value={draft.endMonth}
          />
          <TextField
            error={errors.endYear}
            id="exp-end-year"
            inputMode="numeric"
            label={t("endYear")}
            onChange={(value) => set("endYear", value)}
            placeholder={t("yearExample")}
            value={draft.endYear}
          />
        </div>
      )}
      <TextAreaField
        hint={t("descriptionHint")}
        id="exp-description"
        label={t("description")}
        onChange={(value) => set("description", value)}
        rows={3}
        value={draft.description}
      />
    </EntryDialog>
  );
}

function EducationDialog({
  entry,
  open,
  onOpenChange,
  onSave,
}: {
  readonly entry: Education | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (entry: Education) => void;
}) {
  const t = useTranslations("advisorEdit");
  const thai = useLocale() === "th";
  const [institution, setInstitution] = useState(entry?.institution ?? "");
  const [degree, setDegree] = useState(entry?.degree ?? "");
  const [startYear, setStartYear] = useState(entry ? shownYear(entry.startYear, thai) : "");
  const [endYear, setEndYear] = useState(entry ? shownYear(entry.endYear, thai) : "");
  const [errors, setErrors] = useState<{ institution?: string; startYear?: string; endYear?: string }>({});

  const submit = () => {
    const start = storedYear(startYear, thai);
    const end = storedYear(endYear, thai);
    const found: typeof errors = {};
    if (!institution.trim()) found.institution = t("required");
    if (!yearInRange(start)) found.startYear = t("yearInvalid");
    if (!yearInRange(end)) found.endYear = t("yearInvalid");
    if (start !== null && end !== null && end < start) found.endYear = t("endsBeforeStart");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({ institution: institution.trim(), degree: degree.trim() || null, startYear: start, endYear: end });
  };

  return (
    <EntryDialog onOpenChange={onOpenChange} onSubmit={submit} open={open} title={entry ? t("editEducation") : t("addEducation")}>
      <TextField error={errors.institution} id="edu-institution" label={t("institution")} onChange={setInstitution} value={institution} />
      <TextField hint={t("degreeHint")} id="edu-degree" label={t("degree")} onChange={setDegree} value={degree} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          error={errors.startYear}
          id="edu-start-year"
          inputMode="numeric"
          label={t("startYear")}
          onChange={setStartYear}
          placeholder={t("yearExample")}
          value={startYear}
        />
        <TextField
          error={errors.endYear}
          id="edu-end-year"
          inputMode="numeric"
          label={t("graduationYear")}
          onChange={setEndYear}
          placeholder={t("yearExample")}
          value={endYear}
        />
      </div>
    </EntryDialog>
  );
}

const PROFICIENCIES: readonly ApiLanguageProficiency[] = ["NATIVE", "FLUENT", "PROFESSIONAL", "BASIC"];

function LanguageDialog({
  entry,
  open,
  onOpenChange,
  onSave,
}: {
  readonly entry: Language | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (entry: Language) => void;
}) {
  const t = useTranslations("advisorEdit");
  const p = useTranslations("advisorProfile");
  const [language, setLanguage] = useState(entry?.language ?? "");
  const [proficiency, setProficiency] = useState<ApiLanguageProficiency | "">(entry?.proficiency ?? "");
  const [errors, setErrors] = useState<{ language?: string; proficiency?: string }>({});

  const submit = () => {
    const found: typeof errors = {};
    if (!language.trim()) found.language = t("required");
    if (!proficiency) found.proficiency = t("required");
    setErrors(found);
    if (!proficiency || Object.keys(found).length > 0) return;
    onSave({ language: language.trim(), proficiency });
  };

  return (
    <EntryDialog onOpenChange={onOpenChange} onSubmit={submit} open={open} title={entry ? t("editLanguage") : t("addLanguage")}>
      <TextField error={errors.language} id="lang-name" label={t("language")} onChange={setLanguage} placeholder={t("languageExample")} value={language} />
      <SelectField
        id="lang-level"
        items={PROFICIENCIES.map((value) => ({ value, label: p(`proficiency.${value}`) }))}
        label={t("proficiency")}
        onChange={setProficiency}
        placeholder={t("choose")}
        value={proficiency}
      />
      {errors.proficiency ? <p className="-mt-2 text-sm text-destructive">{errors.proficiency}</p> : null}
    </EntryDialog>
  );
}

function CredentialDialog({
  entry,
  open,
  onOpenChange,
  onSave,
}: {
  readonly entry: Credential | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (entry: Credential) => void;
}) {
  const t = useTranslations("advisorEdit");
  const thai = useLocale() === "th";
  const [title, setTitle] = useState(entry?.title ?? "");
  const [issuer, setIssuer] = useState(entry?.issuer ?? "");
  const [year, setYear] = useState(entry ? shownYear(entry.year, thai) : "");
  const [errors, setErrors] = useState<{ title?: string; year?: string }>({});

  const submit = () => {
    const stored = storedYear(year, thai);
    const found: typeof errors = {};
    if (!title.trim()) found.title = t("required");
    if (!yearInRange(stored)) found.year = t("yearInvalid");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({ title: title.trim(), issuer: issuer.trim() || null, year: stored });
  };

  return (
    <EntryDialog onOpenChange={onOpenChange} onSubmit={submit} open={open} title={entry ? t("editCredential") : t("addCredential")}>
      <TextField error={errors.title} id="cred-title" label={t("credentialTitle")} onChange={setTitle} value={title} />
      <TextField hint={t("issuerHint")} id="cred-issuer" label={t("issuer")} onChange={setIssuer} value={issuer} />
      <TextField
        error={errors.year}
        id="cred-year"
        inputMode="numeric"
        label={t("year")}
        onChange={setYear}
        placeholder={t("yearExample")}
        value={year}
      />
    </EntryDialog>
  );
}

/* --------------------------------------------------------------- sections */

/** One entry in a list: its head and line, and the pencil and the bin at its end. */
function EntryRow({
  head,
  line,
  onEdit,
  onRemove,
}: {
  readonly head: string;
  readonly line: string | null;
  readonly onEdit: () => void;
  readonly onRemove: () => void;
}) {
  const t = useTranslations("advisorEdit");
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-medium text-foreground">{head}</span>
        {line ? <span className="text-sm text-muted-foreground">{line}</span> : null}
      </span>
      <Button aria-label={t("editEntry", { name: head })} className="size-10 rounded-full" onClick={onEdit} size="icon" type="button" variant="ghost">
        <Pencil aria-hidden className="size-4" />
      </Button>
      <Button aria-label={t("removeEntry", { name: head })} className="size-10 rounded-full text-muted-foreground hover:text-destructive" onClick={onRemove} size="icon" type="button" variant="ghost">
        <Trash2 aria-hidden className="size-4" />
      </Button>
    </li>
  );
}

/** A list's section: its head, the entries on hairlines, and the way to add one. */
function ListSection({
  title,
  addLabel,
  onAdd,
  empty,
  children,
}: {
  readonly title: string;
  readonly addLabel: string;
  readonly onAdd: () => void;
  readonly empty: string;
  readonly children: ReactNode;
}) {
  const hasEntries = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="flex flex-col border-t border-border pt-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {hasEntries ? (
        <ul className="mt-2 flex flex-col divide-y divide-border">{children}</ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
      <Button className="mt-3 h-10 self-start rounded-full border-accented px-4 text-sm font-medium" onClick={onAdd} type="button" variant="outline">
        <Plus aria-hidden className="size-4" />
        {addLabel}
      </Button>
    </section>
  );
}

/** Which entry's dialog is open: a list, and the index being edited or null for a new one. */
type Editing =
  | { readonly list: "experiences" | "educations" | "languages" | "credentials"; readonly index: number | null }
  | null;

const EMPTY: ApiAdvisorBackground = { experiences: [], educations: [], languages: [], credentials: [] };

/** A list with one entry put in place (or added when `index` is null). */
function placed<T>(list: readonly T[], index: number | null, entry: T): T[] {
  if (index === null) return [...list, entry];
  return list.map((existing, at) => (at === index ? entry : existing));
}

/* ----------------------------------------------------------------- screen */

/** The form once the profile and the background are in. */
function EditForm({ profile, initial }: { readonly profile: ApiOwnAdvisorProfile; readonly initial: ApiAdvisorBackground }) {
  const t = useTranslations("advisorEdit");
  const a = useTranslations("advisor");
  const p = useTranslations("advisorProfile");
  const thai = useLocale() === "th";
  const [headline, setHeadline] = useState(profile.headline);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [background, setBackground] = useState<ApiAdvisorBackground>(initial);
  const [editing, setEditing] = useState<Editing>(null);
  const [headlineError, setHeadlineError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const status = useStatusToast();

  const close = () => setEditing(null);
  const put = <K extends keyof ApiAdvisorBackground>(list: K, entry: ApiAdvisorBackground[K][number]) => {
    const index = editing?.list === list ? editing.index : null;
    setBackground((now) => ({ ...now, [list]: placed(now[list] as ApiAdvisorBackground[K][number][], index, entry) }));
    close();
  };
  const remove = (list: keyof ApiAdvisorBackground, index: number) =>
    setBackground((now) => ({ ...now, [list]: now[list].filter((_, at) => at !== index) }));

  const yearText = (year: number | null) => (year === null ? null : shownYear(year, thai));
  const period = (entry: Experience) => {
    const end = entry.endYear === null ? p("present") : yearText(entry.endYear);
    return `${yearText(entry.startYear)} – ${end}`;
  };

  const save = () => {
    if (!headline.trim()) {
      setHeadlineError(t("required"));
      return;
    }
    setSaving(true);
    void (async () => {
      try {
        await updateAdvisorProfile({ headline: headline.trim(), bio: bio.trim() });
        const stored = await replaceOwnAdvisorBackground(background);
        setBackground(stored);
        // The public profile and this page read these again next time.
        invalidate("advisors/");
        status.show(t("saved"), true);
      } catch (cause: unknown) {
        status.show(t("saveFailed"), false, cause instanceof Error ? cause.message : String(cause));
      } finally {
        setSaving(false);
      }
    })();
  };

  const entryAt = <K extends keyof ApiAdvisorBackground>(list: K): ApiAdvisorBackground[K][number] | null =>
    editing?.list === list && editing.index !== null ? (background[list][editing.index] ?? null) : null;
  const dialogKey = editing ? `${editing.list}-${editing.index ?? "new"}` : "closed";

  return (
    <>
      <form
        className="flex w-full flex-col gap-6 px-6 pt-3 pb-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">{p("introTitle")}</h2>
          <TextField
            error={headlineError}
            hint={t("headlineHint")}
            id="advisor-headline"
            label={t("headline")}
            onChange={(value) => {
              setHeadline(value);
              setHeadlineError(undefined);
            }}
            value={headline}
          />
          <TextAreaField hint={t("bioHint")} id="advisor-bio" label={t("bio")} onChange={setBio} value={bio} />
        </section>

        <ListSection
          addLabel={t("addExperience")}
          empty={t("emptyExperiences")}
          onAdd={() => setEditing({ list: "experiences", index: null })}
          title={p("experienceTitle")}
        >
          {background.experiences.map((entry, index) => (
            <EntryRow
              head={`${entry.title} · ${entry.organization}`}
              key={`${entry.title}-${entry.organization}-${entry.startYear}`}
              line={period(entry)}
              onEdit={() => setEditing({ list: "experiences", index })}
              onRemove={() => remove("experiences", index)}
            />
          ))}
        </ListSection>

        <ListSection
          addLabel={t("addEducation")}
          empty={t("emptyEducations")}
          onAdd={() => setEditing({ list: "educations", index: null })}
          title={p("educationTitle")}
        >
          {background.educations.map((entry, index) => (
            <EntryRow
              head={entry.degree ? `${entry.institution} · ${entry.degree}` : entry.institution}
              key={`${entry.institution}-${entry.degree ?? ""}`}
              line={[yearText(entry.startYear), yearText(entry.endYear)].filter(Boolean).join(" – ") || null}
              onEdit={() => setEditing({ list: "educations", index })}
              onRemove={() => remove("educations", index)}
            />
          ))}
        </ListSection>

        <ListSection
          addLabel={t("addLanguage")}
          empty={t("emptyLanguages")}
          onAdd={() => setEditing({ list: "languages", index: null })}
          title={p("languagesTitle")}
        >
          {background.languages.map((entry, index) => (
            <EntryRow
              head={entry.language}
              key={entry.language}
              line={p(`proficiency.${entry.proficiency}`)}
              onEdit={() => setEditing({ list: "languages", index })}
              onRemove={() => remove("languages", index)}
            />
          ))}
        </ListSection>

        <ListSection
          addLabel={t("addCredential")}
          empty={t("emptyCredentials")}
          onAdd={() => setEditing({ list: "credentials", index: null })}
          title={p("credentialsTitle")}
        >
          {background.credentials.map((entry, index) => (
            <EntryRow
              head={entry.title}
              key={`${entry.title}-${entry.year ?? ""}`}
              line={[entry.issuer, yearText(entry.year)].filter(Boolean).join(" · ") || null}
              onEdit={() => setEditing({ list: "credentials", index })}
              onRemove={() => remove("credentials", index)}
            />
          ))}
        </ListSection>

        {/* The skills are proved, not typed: their own page sends the proof. */}
        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-lg font-semibold text-foreground">{a("skillsLabel")}</h2>
          <Link className={cn(surfaceClass({ tier: "raised", interactive: true }), "flex w-full items-center gap-3 p-3.5")} href="/advisor/skills">
            <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-px flex-1 text-sm text-foreground">{t("skillsLink")}</span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </section>

        <ScreenActions className="px-0">
          <PrimaryButton disabled={saving} type="submit">
            {saving ? t("saving") : a("save")}
          </PrimaryButton>
          <NeutralButton href="/advisor/profile">{a("cancel")}</NeutralButton>
        </ScreenActions>
      </form>

      {/* Keyed by the entry, so each opening starts from that entry's own values. */}
      {editing?.list === "experiences" ? (
        <ExperienceDialog entry={entryAt("experiences")} key={dialogKey} onOpenChange={(open) => (open ? null : close())} onSave={(entry) => put("experiences", entry)} open />
      ) : null}
      {editing?.list === "educations" ? (
        <EducationDialog entry={entryAt("educations")} key={dialogKey} onOpenChange={(open) => (open ? null : close())} onSave={(entry) => put("educations", entry)} open />
      ) : null}
      {editing?.list === "languages" ? (
        <LanguageDialog entry={entryAt("languages")} key={dialogKey} onOpenChange={(open) => (open ? null : close())} onSave={(entry) => put("languages", entry)} open />
      ) : null}
      {editing?.list === "credentials" ? (
        <CredentialDialog entry={entryAt("credentials")} key={dialogKey} onOpenChange={(open) => (open ? null : close())} onSave={(entry) => put("credentials", entry)} open />
      ) : null}

      <StatusToast
        dismiss={status.dismiss}
        leaving={status.leaving}
        paused={status.paused}
        setPaused={status.setPaused}
        toast={status.toast}
      />
    </>
  );
}

/** Figma "Advisor profile - Edit (Light)" — 995:8722, against the API. */
export function AdvisorProfileEditScreen() {
  const t = useTranslations("advisor");
  const e = useTranslations("advisorEdit");
  const c = useTranslations("common");
  const profile = useResource<ApiOwnAdvisorProfile | null>(
    "advisors/me",
    useCallback((signal: AbortSignal) => getOwnAdvisorProfile(signal), []),
  );
  const background = useResource<ApiAdvisorBackground>(
    "advisors/me/background",
    useCallback((signal: AbortSignal) => getOwnAdvisorBackground(signal), []),
  );
  let body: ReactNode;
  if (profile.loading || background.loading) {
    body = (
      <div aria-busy className="flex w-full flex-col gap-4 px-6 pt-3">
        <span className="h-11 w-full animate-pulse rounded-xl bg-muted" />
        <span className="h-24 w-full animate-pulse rounded-xl bg-muted" />
        <span className="h-16 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  } else if (profile.error || background.error) {
    body = (
      <div className="px-6 pt-3">
        <ApiErrorCard
          error={profile.error ?? background.error ?? new Error(e("loadFailed"))}
          onRetry={() => {
            profile.reload();
            background.reload();
          }}
          title={e("loadFailed")}
        />
      </div>
    );
  } else if (!profile.data) {
    // No application yet: nothing to edit until there is a profile.
    body = (
      <div className="flex flex-col items-start gap-3 px-6 pt-3">
        <p className="text-sm text-muted-foreground">{e("noProfile")}</p>
        <PrimaryButton className="w-auto" href="/advisor/apply">
          {e("apply")}
        </PrimaryButton>
      </div>
    );
  } else {
    body = <EditForm initial={background.data ?? EMPTY} profile={profile.data} />;
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/advisor/profile" label={c("back")} />
      <ScreenBody className="lg:[&>*:not(.sticky)]:mx-auto lg:[&>*:not(.sticky)]:w-full lg:[&>*:not(.sticky)]:max-w-[880px]">
        <ScreenHeading className="gap-2 pt-4" subtitle={t("editSubtitle")} title={t("editTitle")} />
        {body}
      </ScreenBody>
    </MobileScreen>
  );
}
