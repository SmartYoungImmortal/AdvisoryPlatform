"use client";

import Link from "next/link";
import { Ban, LockOpen, Save, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsTextField } from "@/components/cms/fields";
import { useAccountLookup, useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsDataRow, CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import {
  reinstateAccount,
  suspendAccounts,
  updateAccountDetails,
} from "@/lib/mock-db/actions";
import { formatDate, formatDateTime } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import { advisorLevelTitles, type Account } from "@/lib/mock-db/types";
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

function UserEditor({ account }: { readonly account: Account }) {
  const t = useTranslations("cms.userEdit");
  const actorId = useActorId();
  const person = useAccountLookup();
  const { confirm, prompt, toast } = useCmsFeedback();
  const [form, setForm] = useState({
    name: account.name,
    fullName: account.fullName,
    email: account.email,
    phone: account.phone,
  });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [suspendDays, setSuspendDays] = useState<(typeof SUSPEND_OPTIONS)[number]>(30);

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

  const dirty =
    form.name !== account.name ||
    form.fullName !== account.fullName ||
    form.email !== account.email ||
    form.phone !== account.phone;
  const self = account.id === actorId;

  function save() {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = t("nameRequired");
    if (!isEmail(form.email)) next.email = t("emailInvalid");
    else if (emailTaken) next.email = t("emailTaken");
    setErrors(next);
    if (next.name || next.email) return;
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
    toast({ title: t("saved") });
  }

  async function suspend() {
    const reason = await prompt({
      type: "danger",
      title: t("suspendTitle", { name: account.name }),
      description:
        suspendDays === 0 ? t("suspendForever") : t("suspendFor", { days: suspendDays }),
      inputLabel: t("reason"),
      placeholder: t("reasonPlaceholder"),
      confirmLabel: t("suspend"),
    });
    if (reason === null) return;
    const until =
      suspendDays === 0 ? null : new Date(Date.now() + suspendDays * 86_400_000).toISOString();
    suspendAccounts([account.id], reason, until, actorId);
    toast({ color: "warning", title: t("suspended", { name: account.name }) });
  }

  async function reinstate() {
    const ok = await confirm({
      type: "success",
      title:
        account.status === "locked"
          ? t("unlockTitle", { name: account.name })
          : t("reinstateTitle", { name: account.name }),
      description: t("reinstateBody"),
      confirmLabel: account.status === "locked" ? t("unlock") : t("reinstate"),
    });
    if (!ok) return;
    reinstateAccount(account.id, actorId);
    toast({ title: t("reinstated", { name: account.name }) });
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            <>
              <CmsButton block color="action" disabled={!dirty} icon={Save} onClick={save} size="lg">
                {t("save")}
              </CmsButton>
              {account.status === "active" ? (
                <CmsButton block color="error" disabled={self} icon={Ban} onClick={suspend} size="lg">
                  {t("suspend")}
                </CmsButton>
              ) : (
                <CmsButton
                  block
                  color="success"
                  icon={account.status === "locked" ? LockOpen : UserCheck}
                  onClick={reinstate}
                  size="lg"
                >
                  {account.status === "locked" ? t("unlock") : t("reinstate")}
                </CmsButton>
              )}
            </>
          }
          info={[
            { label: t("created"), at: account.createdAt },
            { label: t("updated"), at: account.updatedAt },
            { label: t("lastLogin"), at: account.lastLoginAt },
          ]}
        >
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{t("status")}</span>
            <CmsStatus group="account" value={account.status} />
          </div>
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
          {account.status === "active" && !self ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">{t("suspendLength")}</span>
              <div className="flex gap-1.5" role="radiogroup">
                {SUSPEND_OPTIONS.map((days) => (
                  <CmsButton
                    aria-checked={suspendDays === days}
                    className="flex-1 justify-center"
                    color="neutral"
                    key={days}
                    onClick={() => setSuspendDays(days)}
                    role="radio"
                    size="sm"
                    variant={suspendDays === days ? "solid" : "outline"}
                  >
                    {days === 0 ? t("forever") : t("days", { days })}
                  </CmsButton>
                ))}
              </div>
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
