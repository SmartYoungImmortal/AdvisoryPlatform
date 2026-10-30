"use client";

import { Ban, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { CmsApiError, CmsDetailSkeleton, useRuling } from "@/components/cms/api";
import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsSection } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAdminUserId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import {
  CmsDataList,
  CmsDataRow,
  CmsMissing,
  CmsSidebarOptions,
} from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import {
  ADMIN_KEYS,
  getAdminAccount,
  reinstateAccount,
  suspendAccount,
  type AdminAccountDetail,
} from "@/lib/api/admin";
import { useResource } from "@/lib/api/use-resource";
import { formatDate } from "@/lib/mock-db/format";

/** Everything under this prefix is a read of one account, or the list itself. */
const ACCOUNTS_KEY = ADMIN_KEYS.accounts;
const BACK = "/admin/users";

/**
 * One account, from `GET /api/v1/admin/accounts/:userId`.
 *
 * ## Read-only, because the API has no writer
 *
 * `admin/accounts` is list, get, suspend and reinstate. There is **no `PATCH`**, so
 * the account's names, email and timezone are label and value rows rather than
 * inputs with a Save button that could not work. Restoring a form needs
 * `PATCH /api/v1/admin/accounts/:userId` on the API first. No endpoint carries
 * an advisor's field, level or rating, their usage, the reports about them or
 * an action history, so none of those are here either.
 *
 * ## Suspension
 *
 * `POST .../suspend` with a reason, which is required and capped at 500 characters.
 * It is the only correct route: better-auth's own `ban-user` writes `banned` and
 * `ban_reason` and never touches the `user.status` column, so a ban through it
 * leaves an account that reads `ACTIVE` everywhere and cannot sign in. There is no
 * suspension length on the route; the account stays suspended until an admin
 * reinstates it.
 *
 * A second admin getting there first answers 409 "Account is already suspended",
 * and reinstating an active account answers 409 "Account is not suspended". Both
 * surface as the API's own sentence in a toast, through `useRuling`.
 */
export function UserEditScreen() {
  const t = useTranslations("cms.userEdit");
  const tNav = useTranslations("cms.nav");
  const id = useRecordId();

  const fetcher = useCallback(
    (signal: AbortSignal) => getAdminAccount(id, signal),
    [id],
  );
  const account = useResource<AdminAccountDetail>(`${ACCOUNTS_KEY}/${id}`, fetcher);
  const frame = { backHref: BACK, backLabel: tNav("users"), title: t("title") };

  if (id === "") {
    return (
      <CmsPage {...frame}>
        <CmsMissing backHref={BACK} />
      </CmsPage>
    );
  }

  if (account.loading) {
    return (
      <CmsPage {...frame}>
        <CmsDetailSkeleton rows={5} />
      </CmsPage>
    );
  }

  if (account.error || !account.data) {
    return (
      <CmsPage {...frame}>
        {account.error ? (
          <CmsApiError error={account.error} onRetry={account.reload} />
        ) : (
          <CmsMissing backHref={BACK} />
        )}
      </CmsPage>
    );
  }

  return <UserRecord account={account.data} />;
}

function UserRecord({ account }: { readonly account: AdminAccountDetail }) {
  const t = useTranslations("cms.userEdit");
  const tNav = useTranslations("cms.nav");
  const tUsers = useTranslations("cms.users");
  const { confirm, prompt } = useCmsFeedback();
  const rule = useRuling();
  const selfId = useAdminUserId();
  const self = account.id === selfId;
  const name = account.fullName || account.displayName;

  async function suspend() {
    const reason = await prompt({
      type: "danger",
      title: t("suspendTitle", { name: account.displayName }),
      // No length to promise: the route has none.
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
              <CmsButton block icon={UserCheck} onClick={reinstate} size="lg">
                {t("reinstate")}
              </CmsButton>
            ) : account.status === "ACTIVE" ? (
              <>
                <CmsButton
                  block
                  disabled={self}
                  icon={Ban}
                  onClick={suspend}
                  size="lg"
                  variant="danger-soft"
                >
                  {t("suspend")}
                </CmsButton>
                {self ? (
                  <p className="text-xs text-muted-foreground">{t("selfNote")}</p>
                ) : null}
              </>
            ) : null
          }
          info={[
            { label: t("created"), at: account.createdAt },
            { label: t("updated"), at: account.updatedAt },
          ]}
        />
      }
      backHref={BACK}
      backLabel={tNav("users")}
      badge={<CmsStatus group="account" value={account.status} />}
      description={<span className="font-latin">{account.email}</span>}
      title={
        <span className="flex items-center gap-3">
          {/* `image` is the drawable URL; `avatarKey` is a storage key no admin
              route presigns. Initials only when there is neither. */}
          <CmsAvatar account={{ name: account.displayName, imageUrl: account.image }} size="lg" />
          {name}
        </span>
      }
    >
      <CmsSection title={t("detailsTitle")}>
        <CmsDataList>
          <CmsDataRow label={t("name")}>{account.displayName}</CmsDataRow>
          <CmsDataRow label={t("fullName")}>{account.fullName || "-"}</CmsDataRow>
          <CmsDataRow label={t("email")}>
            <span className="font-latin">{account.email}</span>
          </CmsDataRow>
          <CmsDataRow label={tUsers("col.role")}>
            {account.role ? <CmsStatus group="role" value={account.role} /> : "-"}
          </CmsDataRow>
          <CmsDataRow label={t("advisorTitle")}>
            {account.hasAdvisorProfile ? t("yes") : t("no")}
          </CmsDataRow>
          {/* better-auth's ban flag, read beside the status because the two can
              disagree when something wrote one without the other. */}
          {account.banned ? (
            <CmsDataRow label={t("banTitle")}>
              <span className="text-destructive">{account.banReason ?? t("suspend")}</span>
              <span className="block text-muted-foreground">
                {account.banExpires
                  ? t("until", { date: formatDate(account.banExpires) })
                  : t("indefinite")}
              </span>
            </CmsDataRow>
          ) : null}
        </CmsDataList>
      </CmsSection>
    </CmsPage>
  );
}
