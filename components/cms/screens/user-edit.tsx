"use client";

import { Ban, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { CmsApiError, CmsCardSkeleton, useRuling } from "@/components/cms/api";
import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAdminUserId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import {
  CmsDataRow,
  CmsMissing,
  CmsSidebarOptions,
} from "@/components/cms/sidebar-options";
import { CmsApiStatus } from "@/components/cms/status";
import {
  ADMIN_KEYS,
  getAdminAccount,
  reinstateAccount,
  suspendAccount,
  type AdminAccountDetail,
} from "@/lib/api/admin";
import { useResource } from "@/lib/api/use-resource";
import { formatDate } from "@/lib/mock-db/format";

/** Everything under this prefix is a read of one account, or the queue itself. */
const ACCOUNTS_KEY = ADMIN_KEYS.accounts;

/**
 * One account, from `GET /api/v1/admin/accounts/:userId`.
 *
 * ## Read-only, because the API has no writer
 *
 * `admin/accounts` is list, get, suspend and reinstate. There is **no `PATCH`**, so
 * the display name, full name, email and timezone this screen used to edit cannot
 * be saved, and the form is a set of read-only rows instead of inputs with a Save
 * button that could not work. Restoring the form needs
 * `PATCH /api/v1/admin/accounts/:userId` on the API first.
 *
 * Gone with it, for the same reason — no endpoint carries them:
 *
 * - the advisor card (field, credential, identity status, level, rating): the
 *   account row has only `hasAdvisorProfile`, a boolean
 * - the usage statistics (sessions, bookings, reviews)
 * - the related reports and flags: neither queue can be filtered by account
 * - the action history: the API has no audit log
 *
 * ## Suspension
 *
 * `POST .../suspend` with a reason, which is required and capped at 500 characters.
 * It is the only correct route: better-auth's own `ban-user` writes `banned` and
 * `ban_reason` and never touches the `user.status` column, so a ban through it
 * leaves an account that reads `ACTIVE` everywhere and cannot sign in. There is no
 * suspension length on the route, so the 7/30/indefinite choice is gone; the
 * account stays suspended until an admin reinstates it.
 *
 * A second admin getting there first answers 409 "Account is already suspended",
 * and reinstating an active account answers 409 "Account is not suspended". Both
 * surface as the API's own sentence in a toast, through `useRuling`.
 */
export function UserEditScreen() {
  const t = useTranslations("cms.userEdit");
  const id = useRecordId();

  const fetcher = useCallback(
    (signal: AbortSignal) => getAdminAccount(id, signal),
    [id],
  );
  const account = useResource<AdminAccountDetail>(`${ACCOUNTS_KEY}/${id}`, fetcher);

  if (id === "") {
    return (
      <CmsPage backHref="/admin/users" title={t("title")}>
        <CmsMissing backHref="/admin/users" />
      </CmsPage>
    );
  }

  if (account.loading) {
    return (
      <CmsPage backHref="/admin/users" title={t("title")}>
        <CmsCardSkeleton rows={5} />
      </CmsPage>
    );
  }

  if (account.error || !account.data) {
    return (
      <CmsPage backHref="/admin/users" title={t("title")}>
        {account.error ? (
          <CmsApiError error={account.error} onRetry={account.reload} />
        ) : (
          <CmsMissing backHref="/admin/users" />
        )}
      </CmsPage>
    );
  }

  return <UserRecord account={account.data} />;
}

function UserRecord({ account }: { readonly account: AdminAccountDetail }) {
  const t = useTranslations("cms.userEdit");
  const tUsers = useTranslations("cms.users");
  const { confirm, prompt } = useCmsFeedback();
  const rule = useRuling();
  const selfId = useAdminUserId();
  const self = account.id === selfId;

  async function suspend() {
    const reason = await prompt({
      type: "danger",
      title: t("suspendTitle", { name: account.displayName }),
      // No length to promise, so the copy that promises one is not used.
      description: t("suspendForever"),
      inputLabel: t("reason"),
      placeholder: t("reasonPlaceholder"),
      confirmLabel: t("suspend"),
    });
    if (reason === null) return;
    await rule({
      keyPrefix: ACCOUNTS_KEY,
      run: [() => suspendAccount(account.id, reason)],
      success: t("suspended", { name: account.displayName }),
      successColor: "warning",
    });
  }

  async function reinstate() {
    const ok = await confirm({
      type: "success",
      title: t("reinstateTitle", { name: account.displayName }),
      description: t("reinstateBody"),
      confirmLabel: t("reinstate"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: ACCOUNTS_KEY,
      run: [() => reinstateAccount(account.id)],
      success: t("reinstated", { name: account.displayName }),
    });
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            account.status === "SUSPENDED" ? (
              <CmsButton block color="success" icon={UserCheck} onClick={reinstate} size="lg">
                {t("reinstate")}
              </CmsButton>
            ) : account.status === "ACTIVE" ? (
              <CmsButton
                block
                color="error"
                disabled={self}
                icon={Ban}
                onClick={suspend}
                size="lg"
              >
                {t("suspend")}
              </CmsButton>
            ) : null
          }
          info={[
            { label: t("created"), at: account.createdAt },
            { label: t("updated"), at: account.updatedAt },
          ]}
        >
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{t("status")}</span>
            <CmsApiStatus group="accountStatus" value={account.status} />
          </div>
          {/* better-auth's ban flag, shown beside the status because the two can
              disagree when something wrote one without the other. */}
          {account.banned ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">{account.banReason ?? t("suspend")}</p>
              <p className="mt-1 text-xs">
                {account.banExpires
                  ? t("until", { date: formatDate(account.banExpires) })
                  : t("indefinite")}
              </p>
            </div>
          ) : null}
        </CmsSidebarOptions>
      }
      backHref="/admin/users"
      badge={<CmsApiStatus group="role" value={account.role} />}
      title={account.displayName}
    >
      <CmsCard>
        <div className="mb-6 flex items-center gap-4">
          {/* No portrait: `avatarKey` is a storage key and no admin route
              presigns it, so this is initials rather than a broken image. */}
          <CmsAvatar account={{ name: account.displayName }} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-highlighted">
              {account.displayName}
            </p>
            <p className="truncate font-latin text-sm text-muted-foreground">{account.id}</p>
          </div>
        </div>
        <dl className="space-y-3">
          <CmsDataRow label={t("name")}>{account.displayName}</CmsDataRow>
          <CmsDataRow label={t("fullName")}>{account.fullName || "—"}</CmsDataRow>
          <CmsDataRow label={t("email")}>
            <span className="font-latin">{account.email}</span>
          </CmsDataRow>
          <CmsDataRow label={tUsers("col.role")}>
            <CmsApiStatus group="role" value={account.role} />
          </CmsDataRow>
          {account.hasAdvisorProfile ? (
            <CmsDataRow label={t("advisorTitle")}>
              <CmsApiStatus group="role" value="advisor" />
            </CmsDataRow>
          ) : null}
        </dl>
      </CmsCard>
    </CmsPage>
  );
}
