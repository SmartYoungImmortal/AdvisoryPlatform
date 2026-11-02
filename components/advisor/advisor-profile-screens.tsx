"use client";

import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  Landmark,
  Paperclip,
  Plus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense, useCallback, useRef, useState, type FormEvent } from "react";

import { EntryDialog, FIELD_BOX, SelectField } from "@/components/advisor/edit-fields";
import { authPill } from "@/components/auth/auth-split";
import { asUuid } from "@/components/bookings/booking-flow";
import { Field } from "@/components/mobile/field";
import { StatusToast, useStatusToast } from "@/components/mobile/toast";
import { DayGroup } from "@/components/notifications/notification-center-screen";
import { useOwnProfile } from "@/components/profile/profile-data";
import {
  SETTINGS_DIALOG_ACTIONS,
  SETTINGS_DIALOG_STACK,
  SettingsDialog,
  settingsPill,
  settingsStackPill,
} from "@/components/profile/settings-dialog";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError, FieldLabel, Field as FieldRoot } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DESK_BOX, DESK_GLYPH, DESK_PILL, DESK_ROW, DeskPage } from "@/components/work/desk-page";
import { DESK_BONE, DeskEmpty, DeskFilter, DeskListSkeleton, DeskRow, DeskRowAction } from "@/components/work/desk-parts";
import { usePayouts } from "@/components/work/work-data";
import { WorkEarningsScreen } from "@/components/work/work-screens";
import {
  getMyPayoutAccount,
  PAYOUT_ACCOUNT_KEY,
  PAYOUT_BANKS,
  removeMyPayoutAccount,
  saveMyPayoutAccount,
  type ApiPayout,
  type ApiPayoutAccount,
  type PayoutBank,
} from "@/lib/api/advisor-work";
import { ApiError, type Paginated } from "@/lib/api/client";
import {
  listOwnSkillProofs,
  listSkillCatalogue,
  submitSkillProof,
  type ApiOwnSkillProof,
  type SkillProofReviewStatus,
} from "@/lib/api/onboarding";
import type { ApiNamedRecord } from "@/lib/api/types";
import { invalidate, useLastAnswer, useResource } from "@/lib/api/use-resource";
import { bookingDay } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/** `ApiErrorCard` at the frame's type steps from `lg`, as the transactions page draws it. */
const ERROR_CARD_LG =
  "lg:gap-4 lg:p-7 lg:[&_[data-slot=button]]:h-12 lg:[&_[data-slot=button]]:px-5 lg:[&_[data-slot=button]]:text-frame-meta lg:[&_p]:text-frame-meta lg:[&_p:first-child]:text-frame-figure";

/* ------------------------------------------------------------------ skills */

/** A review's outcome in its own ink, as the earnings page colours a payout's state. */
const PROOF_INK: Record<SkillProofReviewStatus, string> = {
  PENDING: "text-warning",
  APPROVED: "text-success",
  REJECTED: "text-destructive",
};

/** What the API takes as a proof (`skill-proofs.constants.ts`), checked here first. */
const PROOF_TYPES: readonly string[] = ["image/jpeg", "image/png", "application/pdf"];
const PROOF_MAX_BYTES = 50 * 1024 * 1024;

/**
 * Each skill once, as its latest document stands: the first document sent for
 * a skill claims it, and one sent again after a rejection is the review that
 * counts now. In the order the skills were first claimed (the API's order,
 * which a `Map` keeps when a later document replaces an earlier one).
 */
function latestPerSkill(proofs: readonly ApiOwnSkillProof[]): ApiOwnSkillProof[] {
  const bySkill = new Map<string, ApiOwnSkillProof>();
  for (const proof of proofs) {
    const held = bySkill.get(proof.skillId);
    if (!held || proof.createdAt.localeCompare(held.createdAt) >= 0) bySkill.set(proof.skillId, proof);
  }
  return [...bySkill.values()];
}

/**
 * `/advisor/skills`: the skills on the advisor's page, under the profile, laid
 * out as the settings page is — each skill a row with how the review of its
 * document stands and the file it went with, the reason when it was not
 * accepted and the way to send another; a new skill and its document in a
 * popup over the page. All of it is `GET` and `POST /advisors/me/skill-proofs`.
 *
 * The API has no way to take a skill back or to open a document already
 * sent, so neither is offered.
 */
export function SkillManagementScreen() {
  const t = useTranslations("advisor");
  const proofs = useResource<Paginated<ApiOwnSkillProof>>(
    "advisors/me/skill-proofs",
    useCallback((signal: AbortSignal) => listOwnSkillProofs(signal), []),
  );
  // Read again after a send without the rows blinking to their skeleton.
  const answer = useLastAnswer(proofs);
  const ownId = useOwnProfile().data?.id;
  // The skill the popup sends a document for: `""` to choose one, `null` while it is shut.
  const [sending, setSending] = useState<string | null>(null);
  const skills = latestPerSkill(answer?.items ?? []);
  // A skill under review or accepted has its document; the picker offers the rest.
  const settled = new Set(skills.filter((proof) => proof.reviewStatus !== "REJECTED").map((proof) => proof.skillId));

  const sent = () => {
    setSending(null);
    // A skill is on the public page from the moment it is claimed.
    if (ownId) invalidate(`advisors/${ownId}#`);
    proofs.reload();
  };

  return (
    <DeskPage
      action={
        <Button className={cn(authPill(true), DESK_PILL)} disabled={!answer} onClick={() => setSending("")} type="button">
          <Plus aria-hidden />
          {t("addSkill")}
        </Button>
      }
      backHref="/advisor/edit"
      rail="profile"
      title={t("skillsTitle")}
    >
      {proofs.error && !answer ? (
        <div className="mt-5 lg:mt-8">
          <ApiErrorCard className={ERROR_CARD_LG} error={proofs.error} onRetry={proofs.reload} title={t("skillsLoadFailed")} />
        </div>
      ) : !answer ? (
        <SkillsSkeleton label={t("skillsLoading")} />
      ) : skills.length === 0 ? (
        <DeskEmpty body={t("skillsEmptyBody")} icon={FileText} title={t("skillsEmptyTitle")} />
      ) : (
        <ul className="mt-5 flex w-full max-w-220 flex-col lg:mt-8">
          {skills.map((proof) => (
            <DeskRow detail={<ProofLine proof={proof} />} key={proof.skillId} label={proof.skillName}>
              {proof.reviewStatus === "REJECTED" ? (
                <DeskRowAction onClick={() => setSending(proof.skillId)}>{t("resendProof")}</DeskRowAction>
              ) : null}
            </DeskRow>
          ))}
        </ul>
      )}
      {sending === null ? null : (
        <SkillProofDialog onClose={() => setSending(null)} onSent={sent} settled={settled} skillId={sending} />
      )}
    </DeskPage>
  );
}

/** Under a skill's name: how its review stands, the file it went with, and why it was not accepted. */
function ProofLine({ proof }: { readonly proof: ApiOwnSkillProof }) {
  const t = useTranslations("advisor");
  return (
    <>
      <span className={cn("font-medium", PROOF_INK[proof.reviewStatus])}>{t(`proofStatus.${proof.reviewStatus}`)}</span>
      {" · "}
      <span className="font-latin">{proof.originalFileName}</span>
      {proof.reviewStatus === "REJECTED" && proof.rejectionReason ? (
        <span className="mt-0.5 block">{t("proofReason", { reason: proof.rejectionReason })}</span>
      ) : null}
    </>
  );
}

/**
 * A skill's document in a popup over the page — the advisor page editor's
 * entry dialog: the skill from the catalogue (those with a document under
 * review or accepted left out), the file, and sending it, which claims the
 * skill and puts the document in the team's queue. Opened from a skill whose
 * document was not accepted, that skill is chosen already.
 */
function SkillProofDialog({ skillId, settled, onClose, onSent }: {
  readonly skillId: string;
  readonly settled: ReadonlySet<string>;
  readonly onClose: () => void;
  readonly onSent: () => void;
}) {
  const t = useTranslations("advisor");
  const catalogue = useResource<Paginated<ApiNamedRecord>>(
    "skills?page=1&limit=100",
    useCallback((signal: AbortSignal) => listSkillCatalogue(signal), []),
  );
  const picker = useRef<HTMLInputElement>(null);
  const [skill, setSkill] = useState(skillId);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ skill?: string; file?: string }>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const items = (catalogue.data?.items ?? [])
    .filter((entry) => !settled.has(entry.id))
    .map((entry) => ({ value: entry.id, label: entry.name }));

  const pick = (chosen: File | undefined) => {
    if (!chosen) return;
    const fits = PROOF_TYPES.includes(chosen.type) && chosen.size > 0 && chosen.size <= PROOF_MAX_BYTES;
    setFile(fits ? chosen : null);
    setErrors((now) => ({ ...now, file: fits ? undefined : t("proofFileInvalid", { name: chosen.name }) }));
  };

  const submit = () => {
    const found: typeof errors = {};
    if (!skill) found.skill = t("proofSkillRequired");
    // A file refused when it was picked keeps saying why.
    if (!file) found.file = errors.file ?? t("proofFileRequired");
    setErrors(found);
    if (!skill || !file) return;
    setBusy(true);
    setProblem(null);
    submitSkillProof(skill, file)
      .then(onSent)
      .catch((cause: unknown) => {
        // The API's own sentence: it tells "not an applicant yet" from "storage is down".
        setProblem(cause instanceof Error ? cause.message : t("proofSendFailed"));
        setBusy(false);
      });
  };

  return (
    <EntryDialog
      busy={busy}
      focusId={skillId ? "proof-file" : "proof-skill"}
      onOpenChange={(next) => (next ? null : onClose())}
      onSubmit={submit}
      open
      problem={problem ?? (catalogue.error ? t("skillsCatalogueFailed") : null)}
      submitLabel={t("sendProof")}
      title={skillId ? t("resendProof") : t("addSkill")}
    >
      <SelectField
        id="proof-skill"
        items={items}
        label={t("proofSkillLabel")}
        onChange={(next) => {
          setSkill(next);
          setErrors((now) => ({ ...now, skill: undefined }));
        }}
        placeholder={catalogue.data && items.length === 0 ? t("noSkillsLeft") : t("proofSkillPlaceholder")}
        // Until the catalogue is in, a chosen skill has no name to show.
        value={catalogue.data ? skill : ""}
      />
      {errors.skill ? (
        <p className="-mt-2 text-sm text-destructive" role="alert">
          {errors.skill}
        </p>
      ) : null}
      <FieldRoot className="gap-1.5" data-invalid={errors.file ? true : undefined}>
        <FieldLabel className="text-sm font-medium text-muted-foreground" htmlFor="proof-file">
          {t("proofFileLabel")}
        </FieldLabel>
        {/* The field's own box, opening the device's picker: the input itself stays out of sight. */}
        <Button
          aria-describedby="proof-file-note"
          aria-invalid={errors.file ? true : undefined}
          className={cn(FIELD_BOX, "w-full justify-start gap-2.5 font-normal")}
          id="proof-file"
          onClick={() => picker.current?.click()}
          type="button"
          variant="outline"
        >
          <Paperclip aria-hidden className="text-muted-foreground" />
          <span className={cn("min-w-0 truncate", file ? "font-latin text-foreground" : "text-muted-foreground")}>
            {file ? file.name : t("proofFilePlaceholder")}
          </span>
        </Button>
        <Input
          accept={PROOF_TYPES.join(",")}
          aria-hidden
          className="sr-only"
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = "";
          }}
          ref={picker}
          tabIndex={-1}
          type="file"
        />
        {errors.file ? (
          <FieldError className="text-sm" id="proof-file-note">
            {errors.file}
          </FieldError>
        ) : (
          <FieldDescription className="text-sm" id="proof-file-note">
            {t("proofFileRule")}
          </FieldDescription>
        )}
      </FieldRoot>
    </EntryDialog>
  );
}

/** The skills' own shape while they are read: rows as `DeskRow` draws them, a name over its line. */
function SkillsSkeleton({ label }: { readonly label: string }) {
  return (
    <div aria-busy className="mt-5 flex w-full max-w-220 flex-col lg:mt-8">
      <span className="sr-only">{label}</span>
      <ul aria-hidden className="flex flex-col">
        {[0, 1, 2].map((row) => (
          <li className="flex items-center gap-4 border-b border-border py-3 md:py-3.5 lg:gap-8 lg:py-5" key={row}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
              <span className="flex h-lh items-center text-sm lg:text-frame-body">
                <span className={cn(DESK_BONE, "h-3.5 w-40 rounded lg:h-4.5")} />
              </span>
              <span className="flex h-lh items-center text-xs lg:text-frame-meta">
                <span className={cn(DESK_BONE, "h-3 w-56 max-w-full rounded lg:h-4")} />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------- payout account */

/**
 * `/earnings/payout-account/setup`: the payout account page with its popup
 * open, so the addresses that led here (a failed payout's "fix the
 * details") still land on the form.
 */
export function PayoutSetupScreen() {
  return <PayoutAccountScreen setup />;
}

/**
 * The bank as one of the dialog's fields: the outline field's label over a
 * box of the same height and line, the banks listed under it.
 */
function BankField({ value, error, onChange }: {
  readonly value: PayoutBank | "";
  readonly error?: string;
  readonly onChange: (bank: PayoutBank) => void;
}) {
  const t = useTranslations("advisor");
  return (
    <FieldRoot className="gap-1.5" data-invalid={error ? true : undefined}>
      <FieldLabel className="text-sm font-medium text-muted-foreground md:text-base" htmlFor="payout-bank">
        {t("bankLabel")}
      </FieldLabel>
      <Select
        items={PAYOUT_BANKS.map((code) => ({ value: code, label: t(`banks.${code}`) }))}
        onValueChange={(next) => onChange(next as PayoutBank)}
        value={value || null}
      >
        <SelectTrigger
          aria-invalid={error ? true : undefined}
          // `text-base` with a `max-md:` step rather than the trigger's own
          // `text-sm` or a bare `text-xs`: the dialog lifts those two classes
          // to its caption steps from `lg`, and this is a field's type.
          className="w-full rounded-xl border-accented bg-card px-3 text-base shadow-none data-[size=default]:h-9 max-md:text-xs md:data-[size=default]:h-11 lg:px-4 lg:data-[size=default]:h-12"
          id="payout-bank"
        >
          <SelectValue placeholder={t("bankPlaceholder")} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} sideOffset={6}>
          {PAYOUT_BANKS.map((code) => (
            <SelectItem key={code} value={code}>
              {t(`banks.${code}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <FieldError className="text-xs">{error}</FieldError> : null}
    </FieldRoot>
  );
}

/**
 * The account payouts go to, as the settings' centred card over the payout
 * account page: the bank's mark over its title, the bank, the number (10 to
 * 12 digits, spaces and dashes allowed) and the name as the passbook has it,
 * then saving and the way out stacked under them. Saving sends it to
 * `PUT /advisors/me/payout-account`, which has the payment provider check it
 * with the bank; a refusal stays in the card, under the fields.
 */
function PayoutAccountDialog({ adding, onClose, onSaved }: {
  readonly adding: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const t = useTranslations("advisor");
  const [bank, setBank] = useState<PayoutBank | "">("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<{ bank?: string; number?: string; name?: string }>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // A field's complaint goes as soon as it is touched again; the rest stay until the next try.
  const settle = (field: keyof typeof errors) => setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = number.replace(/[\s-]/g, "");
    const found: typeof errors = {};
    if (!bank) found.bank = t("bankRequired");
    if (!/^\d{10,12}$/.test(digits)) found.number = t("accountNoInvalid");
    if (!name.trim()) found.name = t("accountNameRequired");
    setErrors(found);
    if (!bank || Object.keys(found).length > 0) return;

    setSaving(true);
    setProblem(null);
    try {
      await saveMyPayoutAccount({ bank, accountNumber: digits, accountName: name.trim() });
      onSaved();
    } catch (error) {
      setProblem(error instanceof ApiError && error.status === 400 ? t("accountRejected") : t("accountSaveFailed"));
      setSaving(false);
    }
  };

  return (
    <SettingsDialog
      icon={Landmark}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      open
      title={adding ? t("payoutSetupTitle") : t("payoutChangeTitle")}
    >
      <form className="flex w-full flex-col" noValidate onSubmit={(event) => void submit(event)}>
        <div className="flex w-full flex-col gap-4 lg:gap-6">
          <BankField
            error={errors.bank}
            onChange={(next) => {
              setBank(next);
              settle("bank");
            }}
            value={bank}
          />
          <Field
            autoComplete="off"
            error={errors.number}
            id="payout-number"
            inputMode="numeric"
            invalid={Boolean(errors.number)}
            label={t("accountNoLabel")}
            latin
            onChange={(event) => {
              setNumber(event.target.value);
              settle("number");
            }}
            outline
            placeholder={t("accountNoPlaceholder")}
            value={number}
          />
          <Field
            autoComplete="name"
            error={errors.name}
            hint={t("accountNameHint")}
            id="payout-name"
            invalid={Boolean(errors.name)}
            label={t("accountNameLabel")}
            onChange={(event) => {
              setName(event.target.value);
              settle("name");
            }}
            outline
            placeholder={t("accountNamePlaceholder")}
            value={name}
          />
        </div>
        {problem ? (
          <p className="mt-4 text-xs text-destructive md:text-sm" role="alert">
            {problem}
          </p>
        ) : null}
        <div className={SETTINGS_DIALOG_STACK}>
          <Button className={settingsStackPill("solid")} disabled={saving} type="submit">
            {t("saveAccount")}
          </Button>
          <Button className={settingsStackPill("soft")} disabled={saving} onClick={onClose} type="button" variant="ghost">
            {t("cancel")}
          </Button>
        </div>
      </form>
    </SettingsDialog>
  );
}

/**
 * Removing the account, as the settings' confirm card: the question, what
 * happens to the payouts meanwhile, then the way out and removing it in red.
 */
function RemovePayoutAccountDialog({ onClose, onRemoved }: { readonly onClose: () => void; readonly onRemoved: () => void }) {
  const t = useTranslations("advisor");
  const [removing, setRemoving] = useState(false);
  const [failed, setFailed] = useState(false);

  const remove = async () => {
    setRemoving(true);
    setFailed(false);
    try {
      await removeMyPayoutAccount();
      onRemoved();
    } catch {
      setFailed(true);
      setRemoving(false);
    }
  };

  return (
    <SettingsDialog
      description={t("removeAccountBody")}
      onOpenChange={(open) => {
        if (!open && !removing) onClose();
      }}
      open
      title={t("removeAccountTitle")}
    >
      {failed ? (
        <p className="mb-3 text-xs text-destructive md:mb-4 md:text-sm" role="alert">
          {t("accountRemoveFailed")}
        </p>
      ) : null}
      <div className={cn(SETTINGS_DIALOG_ACTIONS, "mt-0 md:mt-0")}>
        <Button className={settingsPill("ghost")} disabled={removing} onClick={onClose} type="button" variant="ghost">
          {t("cancel")}
        </Button>
        <Button className={settingsPill("danger")} disabled={removing} onClick={() => void remove()} type="button" variant="ghost">
          {t("deleteAccount")}
        </Button>
      </div>
    </SettingsDialog>
  );
}

/** The account box's line of rows: what it is on the left, its value on the right. */
const ACCOUNT_ROW = "flex items-baseline justify-between gap-4 border-b border-border py-3.5 last:border-b-0 lg:py-4";

/** The page while the account is read: the box's head and its two rows, then the two pills, at their sizes. */
function PayoutAccountSkeleton() {
  const t = useTranslations("advisor");
  return (
    <div aria-busy className="mt-5 flex w-full max-w-200 flex-col gap-8 lg:mt-8 lg:gap-10">
      <span className="sr-only">{t("payoutLoading")}</span>
      <div aria-hidden className={cn(DESK_BOX, "flex flex-col px-4 py-2 lg:px-6 lg:py-3")}>
        <div className="flex items-center gap-3 py-3 lg:gap-5 lg:py-4">
          <span className={cn(DESK_BONE, "size-9 shrink-0 rounded-full lg:size-12")} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
            <span className="flex h-lh items-center text-sm lg:text-frame-body">
              <span className={cn(DESK_BONE, "h-3.5 w-32 rounded lg:h-4 lg:w-40")} />
            </span>
            <span className="flex h-lh items-center text-xs lg:text-frame-meta">
              <span className={cn(DESK_BONE, "h-3 w-14 rounded lg:h-3.5 lg:w-18")} />
            </span>
          </span>
          <span className="flex h-lh items-center text-xs lg:text-frame-label">
            <span className={cn(DESK_BONE, "h-3 w-16 rounded lg:h-3.5 lg:w-20")} />
          </span>
        </div>
        <div className="flex flex-col border-t border-border">
          {["w-36 lg:w-44", "w-24 lg:w-32"].map((width) => (
            <div className={ACCOUNT_ROW} key={width}>
              <span className="flex h-lh items-center text-sm lg:text-frame-meta">
                <span className={cn(DESK_BONE, "h-3.5 w-16 rounded lg:h-4 lg:w-20")} />
              </span>
              <span className="flex h-lh items-center text-sm lg:text-frame-body">
                <span className={cn(DESK_BONE, "h-3.5 rounded lg:h-4", width)} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="flex w-full items-center gap-3 lg:justify-end">
        <span className={cn(DESK_BONE, "h-10 flex-1 rounded-full lg:h-12 lg:w-32 lg:flex-none")} />
        <span className={cn(DESK_BONE, "h-10 flex-1 rounded-full lg:h-12 lg:w-36 lg:flex-none")} />
      </div>
    </div>
  );
}

/**
 * `/earnings/payout-account`: the account payouts go to, on the desk's frame —
 * the bank and the number's last digits with whether the payment provider has
 * checked it with the bank yet, the account's name and when it was added, then
 * removing it or changing it, each in a popup over the page; `setup` opens
 * with the form up. Without an account, the empty box and the way to add one.
 * All of it is `/advisors/me/payout-account`.
 */
export function PayoutAccountScreen({ setup = false }: { readonly setup?: boolean }) {
  const t = useTranslations("advisor");
  const format = useFormatter();
  const status = useStatusToast();
  const account = useResource<ApiPayoutAccount | null>(
    PAYOUT_ACCOUNT_KEY,
    useCallback((signal: AbortSignal) => getMyPayoutAccount(signal), []),
  );
  const [open, setOpen] = useState<"edit" | "remove" | null>(setup ? "edit" : null);

  const close = () => {
    setOpen(null);
    // Opened by its own address: the address goes back to the page's, in
    // place, so the page (and the toast a save leaves on it) stays mounted.
    if (setup) window.history.replaceState(null, "", "/earnings/payout-account");
  };
  const done = (message: string) => {
    close();
    invalidate(PAYOUT_ACCOUNT_KEY);
    account.reload();
    status.show(message, true);
  };

  let body;
  if (account.error) {
    body = (
      <div className="mt-5 w-full max-w-200 lg:mt-8">
        <ApiErrorCard className={ERROR_CARD_LG} error={account.error} onRetry={account.reload} title={t("payoutLoadFailed")} />
      </div>
    );
  } else if (account.data === undefined) {
    body = <PayoutAccountSkeleton />;
  } else if (account.data === null) {
    body = (
      <DeskEmpty
        action={{ label: t("addAccount"), href: "/earnings/payout-account/setup" }}
        body={t("payoutEmptyBody")}
        icon={Landmark}
        title={t("payoutEmptyTitle")}
      />
    );
  } else {
    const { bank, accountName, lastDigits, verified, createdAt } = account.data;
    body = (
      <div className="mt-5 flex w-full max-w-200 flex-col gap-8 lg:mt-8 lg:gap-10">
        <div className={cn(DESK_BOX, "flex flex-col px-4 py-2 lg:px-6 lg:py-3")}>
          <div className="flex items-center gap-3 py-3 lg:gap-5 lg:py-4">
            <span className={DESK_GLYPH}>
              <Landmark aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
              <span className="truncate text-sm font-medium text-foreground lg:text-frame-body">{t(`banks.${bank}`)}</span>
              <span className="truncate font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-meta">
                {t("accountMasked", { digits: lastDigits ?? "····" })}
              </span>
            </span>
            {verified ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-success lg:text-frame-label">
                <CircleCheck aria-hidden className="size-3.5" />
                {t("verified")}
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 text-xs text-warning lg:text-frame-label">
                <Clock aria-hidden className="size-3.5" />
                {t("verifying")}
              </span>
            )}
          </div>
          <dl className="flex flex-col border-t border-border">
            <div className={ACCOUNT_ROW}>
              <dt className="text-sm text-muted-foreground lg:text-frame-meta">{t("accountNameLabel")}</dt>
              <dd className="min-w-0 truncate text-sm font-medium text-foreground lg:text-frame-body">{accountName}</dd>
            </div>
            {createdAt ? (
              <div className={ACCOUNT_ROW}>
                <dt className="text-sm text-muted-foreground lg:text-frame-meta">{t("addedOnLabel")}</dt>
                <dd className="text-sm font-medium text-foreground lg:text-frame-body">
                  {format.dateTime(new Date(createdAt), { day: "numeric", month: "long", year: "numeric" })}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="flex w-full items-center gap-3 lg:justify-end">
          <Button className={cn(authPill(false), DESK_PILL, "flex-1 lg:flex-none")} onClick={() => setOpen("remove")} type="button" variant="outline">
            {t("deleteAccount")}
          </Button>
          <Button className={cn(authPill(true), DESK_PILL, "flex-1 lg:flex-none")} onClick={() => setOpen("edit")} type="button">
            {t("changeAccount")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DeskPage backHref="/work/earnings" title={t("payoutTitle")}>
      {body}
      {open === "edit" && account.data !== undefined ? (
        <PayoutAccountDialog adding={!account.data} onClose={close} onSaved={() => done(t("accountSaved"))} />
      ) : null}
      {open === "remove" ? <RemovePayoutAccountDialog onClose={close} onRemoved={() => done(t("accountRemoved"))} /> : null}
      <StatusToast dismiss={status.dismiss} leaving={status.leaving} paused={status.paused} setPaused={status.setPaused} toast={status.toast} />
    </DeskPage>
  );
}

/* ----------------------------------------------------------------- payouts */

/** A payout's state in its own word and ink, as the earnings page colours it. */
const PAYOUT_INK: Record<ApiPayout["status"], string> = {
  PENDING: "text-warning",
  PAID: "text-success",
  FAILED: "text-destructive",
};

/** The mark beside a payout's state on its own page. */
const PAYOUT_MARK: Record<ApiPayout["status"], LucideIcon> = {
  PENDING: Clock,
  PAID: CircleCheck,
  FAILED: CircleAlert,
};

/** Satang as baht with the ฿ sign; satang shown only when there are some. */
function useBaht(): (satang: number) => string {
  const format = useFormatter();
  return (satang) => {
    const digits = satang % 100 === 0 ? 0 : 2;
    return format.number(satang / 100, {
      style: "currency",
      currency: "THB",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };
}

/**
 * `/earnings/payout-history`: every payout, a month to a group, newest first,
 * on the desk's frame under รายได้ — the list the earnings page holds
 * (`WorkEarningsScreen`), kept at this address so the links that lead here
 * land on it. Capsules by state with what each sums to; a payout that failed
 * opens its own page. All of it is `GET /advisors/me/payouts`.
 */
export function PayoutHistoryScreen() {
  const w = useTranslations("workDesk");
  const format = useFormatter();
  const baht = useBaht();
  const profile = useOwnProfile();
  const payouts = usePayouts();
  const [shown, setShown] = useState<"all" | ApiPayout["status"]>("all");

  const timeZone = profile.data?.timezone;
  const failure = payouts.error ?? (profile.data ? null : profile.error);
  const items = payouts.data?.items ?? [];
  const sum = (status: ApiPayout["status"]) =>
    items.filter((item) => item.status === status).reduce((total, item) => total + item.netAmountSatang, 0);
  const visible = shown === "all" ? items : items.filter((item) => item.status === shown);

  const months: { key: string; label: string; rows: ApiPayout[] }[] = [];
  if (timeZone) {
    for (const payout of visible.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      const key = bookingDay(payout.createdAt, timeZone).slice(0, 7);
      let group = months.at(-1);
      if (group?.key !== key) {
        group = { key, label: format.dateTime(new Date(payout.createdAt), { month: "long", year: "numeric", timeZone }), rows: [] };
        months.push(group);
      }
      group.rows.push(payout);
    }
  }

  return (
    <DeskPage backHref="/work/earnings" title={w("historyTitle")}>
      {failure ? (
        <div className="mt-5 lg:mt-8">
          <ApiErrorCard
            className={ERROR_CARD_LG}
            error={failure}
            onRetry={() => {
              if (payouts.error) payouts.reload();
              if (profile.error) profile.reload();
            }}
            title={w("earningsLoadFailed")}
          />
        </div>
      ) : !payouts.data || !timeZone ? (
        <DeskListSkeleton capsules={["w-22 lg:w-26", "w-32 lg:w-38", "w-26 lg:w-30"]} label={w("loading")} rows={1} />
      ) : items.length === 0 ? (
        <DeskEmpty
          action={{ label: w("earningsEmptyAction"), href: "/earnings/payout-account" }}
          body={w("earningsEmptyBody")}
          icon={Wallet}
          title={w("earningsEmptyTitle")}
        />
      ) : (
        <>
          <DeskFilter
            label={w("historyTitle")}
            onChange={setShown}
            options={[
              { key: "all", label: w("filterAll"), note: format.number(items.length) },
              { key: "PAID", label: w("payoutStatus.PAID"), note: baht(sum("PAID")) },
              { key: "PENDING", label: w("payoutStatus.PENDING"), note: baht(sum("PENDING")) },
              ...(items.some((item) => item.status === "FAILED")
                ? [{ key: "FAILED" as const, label: w("payoutStatus.FAILED"), note: baht(sum("FAILED")) }]
                : []),
            ]}
            value={shown}
          />
          {months.length === 0 ? (
            <p className="pt-8 text-sm text-muted-foreground lg:pt-12 lg:text-frame-body">{w("filteredEmpty")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {months.map((month) => (
                <DayGroup key={month.key} label={month.label}>
                  {month.rows.map((payout) => (
                    <PayoutRow baht={baht} key={payout.id} payout={payout} timeZone={timeZone} />
                  ))}
                </DayGroup>
              ))}
            </div>
          )}
        </>
      )}
    </DeskPage>
  );
}

/**
 * One payout, the transactions page's row: the wallet in a soft circle, the
 * transfer and its day, the net over its state. One that failed is the way
 * to its own page, with the row's hover.
 */
function PayoutRow({ payout, timeZone, baht }: {
  readonly payout: ApiPayout;
  readonly timeZone: string;
  readonly baht: (satang: number) => string;
}) {
  const w = useTranslations("workDesk");
  const format = useFormatter();
  const day = format.dateTime(new Date(payout.paidAt ?? payout.createdAt), { day: "numeric", month: "short", timeZone });
  const body = (
    <>
      <span className={DESK_GLYPH}>
        <Wallet aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
        <span className="truncate text-sm font-medium text-foreground lg:text-frame-body">{w("payoutTitle")}</span>
        <span className="truncate text-xs text-muted-foreground lg:text-frame-meta">
          <span className="font-latin tabular-nums">{day}</span>
          {payout.transferFeeSatang > 0 ? ` · ${w("payoutFee", { fee: baht(payout.transferFeeSatang) })}` : null}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 lg:gap-1">
        <span
          className={cn(
            "font-latin text-sm font-semibold whitespace-nowrap tabular-nums lg:text-frame-meta",
            payout.status === "PAID" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {baht(payout.netAmountSatang)}
        </span>
        <span className={cn("text-xs whitespace-nowrap lg:text-frame-label", PAYOUT_INK[payout.status])}>
          {w(`payoutStatus.${payout.status}`)}
        </span>
      </span>
    </>
  );

  if (payout.status === "FAILED") {
    return (
      <li>
        <Link className={DESK_ROW} href={`/earnings/payout-history/failed?id=${encodeURIComponent(payout.id)}`}>
          {body}
        </Link>
      </li>
    );
  }
  return <li className="-mx-3 flex items-start gap-3 rounded-card px-3 py-2.5 lg:-mx-4 lg:gap-5 lg:px-4 lg:py-3.5">{body}</li>;
}

/**
 * `/earnings/payout-history/failed?id=`: one payout on its own page, under
 * รายได้ — the payout account page's box: the net and when it was made with
 * how it stands, then its sums and references on hairlines; for one that
 * failed, the way to the payout account it was sent to. Without an `id` (the
 * address as it was before it carried one) it is the latest that failed.
 *
 * The API has no route for one payout, so it is read out of the advisor's
 * list (`GET /advisors/me/payouts`); and a failed payout carries no reason,
 * so none is given.
 */
export function PayoutFailedScreen() {
  const w = useTranslations("workDesk");
  return (
    <Suspense
      fallback={
        <DeskPage backHref="/work/earnings" title={w("failedTitle")}>
          <PayoutSkeleton label={w("loading")} />
        </DeskPage>
      }
    >
      <PayoutFromQuery />
    </Suspense>
  );
}

function PayoutFromQuery() {
  const id = asUuid(useSearchParams().get("id"));
  const w = useTranslations("workDesk");
  const profile = useOwnProfile();
  const payouts = usePayouts();
  const items = payouts.data?.items ?? [];
  const payout = id
    ? items.find((item) => item.id === id)
    : items.filter((item) => item.status === "FAILED").toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const failure = payouts.error ?? (profile.data ? null : profile.error);

  if (payout && profile.data) return <PayoutView payout={payout} timeZone={profile.data.timezone} />;
  return (
    <DeskPage backHref="/work/earnings" title={w("failedTitle")}>
      {failure ? (
        <div className="mt-5 lg:mt-8">
          <ApiErrorCard
            className={ERROR_CARD_LG}
            error={failure}
            onRetry={() => {
              if (payouts.error) payouts.reload();
              if (profile.error) profile.reload();
            }}
            title={w("earningsLoadFailed")}
          />
        </div>
      ) : !payouts.data || !profile.data ? (
        <PayoutSkeleton label={w("loading")} />
      ) : id ? (
        <p className="mt-5 text-sm text-muted-foreground lg:mt-8 lg:text-frame-meta" role="alert">
          {w("payoutMissing")}
        </p>
      ) : (
        <DeskEmpty
          action={{ label: w("seeEarnings"), href: "/work/earnings" }}
          body={w("noFailedBody")}
          icon={Wallet}
          title={w("noFailedTitle")}
        />
      )}
    </DeskPage>
  );
}

function PayoutView({ payout, timeZone }: { readonly payout: ApiPayout; readonly timeZone: string }) {
  const w = useTranslations("workDesk");
  const format = useFormatter();
  const baht = useBaht();
  const Mark = PAYOUT_MARK[payout.status];
  const failed = payout.status === "FAILED";
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone });
  // What the record holds and nothing it does not: a paid day only once it was paid, the bank's reference only once there is one.
  const rows: { readonly label: string; readonly value: string }[] = [
    { label: w("grossLabel"), value: baht(payout.amountSatang) },
    { label: w("feeLabel"), value: baht(payout.transferFeeSatang) },
    { label: w("netLabel"), value: baht(payout.netAmountSatang) },
    ...(payout.paidAt ? [{ label: w("paidAtLabel"), value: when(payout.paidAt) }] : []),
    ...(payout.providerTransferId ? [{ label: w("transferRefLabel"), value: payout.providerTransferId }] : []),
    { label: w("payoutRefLabel"), value: payout.id.slice(0, 8).toUpperCase() },
  ];

  return (
    <DeskPage backHref="/work/earnings" title={failed ? w("failedTitle") : w("payoutTitle")}>
      <div className="mt-5 flex w-full max-w-200 flex-col gap-8 lg:mt-8 lg:gap-10">
        <div className={cn(DESK_BOX, "flex flex-col px-4 py-2 lg:px-6 lg:py-3")}>
          <div className="flex items-center gap-3 py-3 lg:gap-5 lg:py-4">
            <span className={DESK_GLYPH}>
              <Wallet aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
              <span className="truncate font-latin text-base font-semibold text-foreground tabular-nums lg:text-frame-figure">
                {baht(payout.netAmountSatang)}
              </span>
              <span className="truncate font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-meta">{when(payout.createdAt)}</span>
            </span>
            <span className={cn("flex shrink-0 items-center gap-1 text-xs lg:text-frame-label", PAYOUT_INK[payout.status])}>
              <Mark aria-hidden className="size-3.5" />
              {w(`payoutStatus.${payout.status}`)}
            </span>
          </div>
          <dl className="flex flex-col border-t border-border">
            {rows.map((row) => (
              <div className="flex items-baseline justify-between gap-4 border-b border-border py-3.5 last:border-b-0 lg:py-4" key={row.label}>
                <dt className="text-sm text-muted-foreground lg:text-frame-meta">{row.label}</dt>
                <dd className="min-w-0 text-right font-latin text-sm font-medium break-words text-foreground tabular-nums lg:text-frame-body">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {failed ? (
          <div className="flex w-full items-center gap-3 lg:justify-end">
            <Button className={cn(authPill(true), DESK_PILL, "flex-1 lg:flex-none")} nativeButton={false} render={<Link href="/earnings/payout-account" />}>
              {w("checkPayoutAccount")}
            </Button>
          </div>
        ) : null}
      </div>
    </DeskPage>
  );
}

/** A payout's own shape while it is read: the box's head and its lines, and the capsule under it. */
function PayoutSkeleton({ label }: { readonly label: string }) {
  return (
    <div aria-busy className="mt-5 flex w-full max-w-200 flex-col gap-8 lg:mt-8 lg:gap-10">
      <span className="sr-only">{label}</span>
      <div aria-hidden className={cn(DESK_BOX, "flex flex-col px-4 py-2 lg:px-6 lg:py-3")}>
        <div className="flex items-center gap-3 py-3 lg:gap-5 lg:py-4">
          <span className={cn(DESK_BONE, "size-9 shrink-0 rounded-full lg:size-12")} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
            <span className="flex h-lh items-center text-base lg:text-frame-figure">
              <span className={cn(DESK_BONE, "h-4 w-24 rounded lg:h-5 lg:w-32")} />
            </span>
            <span className="flex h-lh items-center text-xs lg:text-frame-meta">
              <span className={cn(DESK_BONE, "h-3 w-32 rounded lg:h-4 lg:w-40")} />
            </span>
          </span>
          <span className="flex h-lh shrink-0 items-center text-xs lg:text-frame-label">
            <span className={cn(DESK_BONE, "h-3 w-12 rounded lg:h-3.5 lg:w-14")} />
          </span>
        </div>
        <div className="flex flex-col border-t border-border">
          {[0, 1, 2, 3].map((row) => (
            <div className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-b-0 lg:py-4" key={row}>
              <span className="flex h-lh items-center text-sm lg:text-frame-meta">
                <span className={cn(DESK_BONE, "h-3.5 w-24 rounded lg:h-4 lg:w-32")} />
              </span>
              <span className="flex h-lh items-center text-sm lg:text-frame-body">
                <span className={cn(DESK_BONE, "h-3.5 w-16 rounded lg:h-4.5 lg:w-20")} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="flex w-full lg:justify-end">
        <span className={cn(DESK_BONE, "h-10 flex-1 rounded-full lg:h-12 lg:w-48 lg:flex-none")} />
      </div>
    </div>
  );
}

/**
 * Figma "Advisor - Earnings (Light)" — 995:8682, and now one screen instead of two.
 *
 * There were two earnings screens: this one and `WorkEarningsScreen`, each with its
 * own balance card, its own three-row ledger and its own list of paid sessions, both
 * reading the same `advisor.*` copy. Two screens that show the same money will drift
 * — this one still had no `lg:` layout, no status colour and a withdraw button that
 * spanned the page — so the hub's version survived and `/earnings` renders it. The
 * export stays because the route file is what points at it.
 */
export function EarningsScreen() {
  return <WorkEarningsScreen />;
}
