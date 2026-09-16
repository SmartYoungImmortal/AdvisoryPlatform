"use client";

import Link from "next/link";
import { Ban, LockOpen, Save, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import {
  CmsFormField,
  CmsSelect,
  CmsTextarea,
  CmsTextField,
  type CmsOption,
} from "@/components/cms/fields";
import { useAccountLookup, useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsDataRow, CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { CmsStatus, useStatusLabels } from "@/components/cms/status";
import {
  reinstateAccount,
  suspendAccounts,
  updateAccountDetails,
} from "@/lib/mock-db/actions";
import { formatDate, formatDateTime } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import { advisorLevelTitles, type Account, type AccountStatus } from "@/lib/mock-db/types";
import { isEmail } from "@/lib/session";

const SUSPEND_OPTIONS = [7, 30, 0] as const;

/** A user's record: the editable basics, their standing, and their history. */
export function UserEditScreen() {
  const t = useTranslations("cms.userEdit");
  const id = useRecordId();
  const account = useDatabase((db) => db.accounts.find((a) => a.id === id));

  if (!account) {
    return (
      <CmsPage backHref="/admin/users" title={t("title")}>
        <CmsMissing backHref="/admin/users" />
      </CmsPage>
    );
  }
  // Keyed on `updatedAt` too: a save here, a bulk action or another tab changing
  // the record starts the form over from what is stored.
  return <UserEditor account={account} key={`${account.id}:${account.updatedAt}`} />;
}

/** What the status select can set: keep or restore access, or suspend for a length. */
type StatusChoice = AccountStatus | "suspend-7" | "suspend-30" | "suspend-0";

const SUSPEND_PREFIX = "suspend-";

/** The suspension length a choice stands for (0 = indefinite), or null for none. */
function suspendDays(choice: StatusChoice): number | null {
  return choice.startsWith(SUSPEND_PREFIX) ? Number(choice.slice(SUSPEND_PREFIX.length)) : null;
}

function UserEditor({ account }: { readonly account: Account }) {
  const t = useTranslations("cms.userEdit");
  const labels = useStatusLabels();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { toast } = useCmsFeedback();
  const statusId = useId();
  const reasonId = useId();
  const [form, setForm] = useState({
    name: account.name,
    fullName: account.fullName,
    email: account.email,
    phone: account.phone,
  });
  const [status, setStatus] = useState<StatusChoice>(account.status);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; reason?: string }>({});

  const emailTaken = useDatabase((db) =>
    db.accounts.some(
      (a) => a.id !== account.id && a.email.toLowerCase() === form.email.trim().toLowerCase(),
    ),
  );
  const reports = useDatabase((db) => db.reports);
  const flags = useDatabase((db) => db.offPlatformFlags);
  const audit = useDatabase((db) => db.audit);
  const cases = [
    ...reports
      .filter((r) => r.reportedId === account.id)
      .map((r) => ({ id: r.id, href: `/admin/reports/review?id=${r.id}`, at: r.createdAt, text: r.detail, status: r.status })),
    ...flags
      .filter((f) => f.senderId === account.id)
      .map((f) => ({ id: f.id, href: `/admin/off-platform/review?id=${f.id}`, at: f.detectedAt, text: f.message, status: f.status })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const history = audit.filter((entry) => entry.targetId === account.id);

  const self = account.id === actorId;
  const days = suspendDays(status);

  // "Active" reads as the action that gets the account there from where it is.
  const activeLabel = {
    active: labels.account.active,
    suspended: t("reinstate"),
    locked: t("unlock"),
  }[account.status];

  const statusItems: ReadonlyArray<CmsOption<StatusChoice>> = [
    {
      value: "active",
      label: activeLabel,
      icon: account.status === "locked" ? LockOpen : UserCheck,
    },
    ...(account.status === "active"
      ? SUSPEND_OPTIONS.map((length) => ({
          value: `suspend-${length}` as const,
          label: length === 0 ? t("suspendForeverOption") : t("suspendOption", { days: length }),
          icon: Ban,
        }))
      : [{ value: account.status, label: labels.account[account.status], icon: Ban }]),
  ];

  function save() {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = t("nameRequired");
    if (!isEmail(form.email)) next.email = t("emailInvalid");
    else if (emailTaken) next.email = t("emailTaken");
    if (days !== null && !reason.trim()) next.reason = t("reasonRequired");
    setErrors(next);
    if (next.name || next.email || next.reason) return;

    updateAccountDetails(
      account.id,
      {
        name: form.name.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      },
      actorId,
    );
    if (days !== null) {
      const until = days === 0 ? null : new Date(Date.now() + days * 86_400_000).toISOString();
      suspendAccounts([account.id], reason.trim(), until, actorId);
      toast({ color: "warning", title: t("suspended", { name: account.name }) });
    } else if (status === "active" && account.status !== "active") {
      reinstateAccount(account.id, actorId);
      toast({ title: t("reinstated", { name: account.name }) });
    } else {
      toast({ title: t("saved") });
    }
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            <CmsButton block color="action" icon={Save} onClick={save} size="lg">
              {t("save")}
            </CmsButton>
          }
          info={[
            { label: t("created"), at: account.createdAt },
            { label: t("updated"), at: account.updatedAt },
            { label: t("lastLogin"), at: account.lastLoginAt },
          ]}
        >
          <CmsFormField
            help={self ? t("selfHelp") : undefined}
            htmlFor={statusId}
            label={t("status")}
          >
            <CmsSelect
              disabled={self}
              id={statusId}
              items={statusItems}
              onValueChange={(value) => {
                setStatus(value);
                setErrors({ ...errors, reason: undefined });
              }}
              value={status}
            />
          </CmsFormField>
          {days !== null ? (
            <CmsFormField
              error={errors.reason}
              help={t("reasonHelp")}
              htmlFor={reasonId}
              label={t("reason")}
              required
            >
              <CmsTextarea
                id={reasonId}
                invalid={Boolean(errors.reason)}
                onChange={(event) => {
                  setReason(event.target.value);
                  setErrors({ ...errors, reason: undefined });
                }}
                placeholder={t("reasonPlaceholder")}
                rows={3}
                value={reason}
              />
            </CmsFormField>
          ) : null}
          {account.suspension ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">{account.suspension.reason}</p>
              <p className="mt-1 text-xs">
                {account.suspension.until
                  ? t("until", { date: formatDate(account.suspension.until) })
                  : t("indefinite")}
                {" · "}
                {t("by", { name: person(account.suspension.by)?.name ?? account.suspension.by })}
              </p>
            </div>
          ) : null}
          {account.failedLogins > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("failedLogins", { count: account.failedLogins })}
            </p>
          ) : null}
        </CmsSidebarOptions>
      }
      backHref="/admin/users"
      badge={<CmsStatus group="role" value={account.role} />}
      title={account.name}
    >
      <CmsCard>
        <div className="mb-6 flex items-center gap-4">
          <CmsAvatar account={account} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-highlighted">{account.name}</p>
            <p className="truncate font-latin text-sm text-muted-foreground">{account.id}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CmsTextField
            error={errors.name}
            label={t("name")}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            value={form.name}
          />
          <CmsTextField
            label={t("fullName")}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            value={form.fullName}
          />
          <CmsTextField
            error={errors.email}
            label={t("email")}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
            type="email"
            value={form.email}
          />
          <CmsTextField
            label={t("phone")}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            type="tel"
            value={form.phone}
          />
        </div>
      </CmsCard>

      {account.advisor ? (
        <CmsCard title={t("advisorTitle")}>
          <dl className="space-y-3">
            <CmsDataRow label={t("field")}>{account.advisor.field}</CmsDataRow>
            <CmsDataRow label={t("credential")}>{account.advisor.credential}</CmsDataRow>
            <CmsDataRow label={t("identity")}>
              <CmsStatus group="identity" value={account.advisor.identity} />
            </CmsDataRow>
            <CmsDataRow label={t("level")}>
              {t("levelValue", {
                level: account.advisor.level,
                title: advisorLevelTitles[account.advisor.level],
              })}
            </CmsDataRow>
            <CmsDataRow label={t("rating")}>
              <span className="font-latin">{account.advisor.rating.toFixed(1)}</span>
            </CmsDataRow>
          </dl>
        </CmsCard>
      ) : null}

      <CmsCard title={t("statsTitle")}>
        <dl className="grid grid-cols-3 gap-4 text-center">
          {(["sessions", "bookings", "reviews"] as const).map((key) => (
            <div key={key}>
              <dt className="text-sm text-muted-foreground">{t(`stat.${key}`)}</dt>
              <dd className="font-latin text-2xl font-semibold text-highlighted">{account.stats[key]}</dd>
            </div>
          ))}
        </dl>
      </CmsCard>

      <CmsCard bodyClassName="p-0 sm:p-0" title={t("casesTitle", { count: cases.length })}>
        <ul className="divide-y divide-border">
          {cases.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground sm:px-6">{t("noCases")}</li>
          ) : (
            cases.map((item) => (
              <li key={item.id}>
                <Link
                  className="flex items-center justify-between gap-3 p-4 text-sm transition-colors hover:bg-muted/50 sm:px-6"
                  href={item.href}
                >
                  <span className="min-w-0 truncate text-foreground">{item.text}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatDateTime(item.at)}</span>
                    <CmsStatus group="report" value={item.status} />
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </CmsCard>

      <CmsCard bodyClassName="p-0 sm:p-0" title={t("historyTitle")}>
        <ul className="divide-y divide-border">
          {history.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground sm:px-6">{t("noHistory")}</li>
          ) : (
            history.map((entry) => (
              <li className="flex items-center justify-between gap-3 p-4 text-sm sm:px-6" key={entry.id}>
                <span className="min-w-0 truncate">
                  <span className="font-latin text-highlighted">{entry.action}</span>
                  {entry.summary ? <span className="text-muted-foreground"> — {entry.summary}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(entry.at)}</span>
              </li>
            ))
          )}
        </ul>
      </CmsCard>
    </CmsPage>
  );
}
