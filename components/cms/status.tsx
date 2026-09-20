"use client";

import { useTranslations } from "next-intl";

import { CmsBadge, type CmsBadgeColor } from "@/components/cms/badge";
import type {
  Account,
  IdentityStatus,
  PayoutStatus,
  PublishStatus,
  RefundStatus,
  ReportStatus,
  RiskLevel,
  Role,
  SkillProof,
  TransactionStatus,
} from "@/lib/mock-db/types";

/**
 * Every status the console prints, as Nexus's `cmsGetStatusBadgeProps` does it:
 * a colour and a label per value, rendered as a soft badge.
 */
type StatusMaps = {
  readonly account: Record<Account["status"], string>;
  readonly role: Record<Role, string>;
  readonly identity: Record<IdentityStatus, string>;
  readonly proof: Record<SkillProof["status"], string>;
  readonly publish: Record<PublishStatus, string>;
  readonly refund: Record<RefundStatus, string>;
  readonly report: Record<ReportStatus, string>;
  readonly risk: Record<RiskLevel, string>;
  readonly payout: Record<PayoutStatus, string>;
  readonly transaction: Record<TransactionStatus, string>;
};

const COLORS: { readonly [G in keyof StatusMaps]: Record<keyof StatusMaps[G], CmsBadgeColor> } = {
  account: { active: "success", suspended: "error", locked: "warning" },
  role: { advisee: "neutral", advisor: "action", admin: "primary" },
  identity: { none: "neutral", submitted: "warning", verified: "success", rejected: "error" },
  proof: { pending: "warning", approved: "success", rejected: "error" },
  publish: { published: "success", hidden: "neutral" },
  refund: { pending: "warning", approved: "success", rejected: "error" },
  report: { open: "warning", dismissed: "neutral", warned: "info", suspended: "error" },
  risk: { low: "neutral", medium: "warning", high: "error" },
  payout: { pending: "warning", paid: "success", failed: "error" },
  transaction: { paid: "success", refunded: "info", failed: "error" },
};

export function useStatusLabels(): StatusMaps {
  const t = useTranslations("cms.status");
  return {
    account: {
      active: t("account.active"),
      suspended: t("account.suspended"),
      locked: t("account.locked"),
    },
    role: {
      advisee: t("role.advisee"),
      advisor: t("role.advisor"),
      admin: t("role.admin"),
    },
    identity: {
      none: t("identity.none"),
      submitted: t("identity.submitted"),
      verified: t("identity.verified"),
      rejected: t("identity.rejected"),
    },
    proof: {
      pending: t("proof.pending"),
      approved: t("proof.approved"),
      rejected: t("proof.rejected"),
    },
    publish: {
      published: t("publish.published"),
      hidden: t("publish.hidden"),
    },
    refund: {
      pending: t("refund.pending"),
      approved: t("refund.approved"),
      rejected: t("refund.rejected"),
    },
    report: {
      open: t("report.open"),
      dismissed: t("report.dismissed"),
      warned: t("report.warned"),
      suspended: t("report.suspended"),
    },
    risk: {
      low: t("risk.low"),
      medium: t("risk.medium"),
      high: t("risk.high"),
    },
    payout: {
      pending: t("payout.pending"),
      paid: t("payout.paid"),
      failed: t("payout.failed"),
    },
    transaction: {
      paid: t("transaction.paid"),
      refunded: t("transaction.refunded"),
      failed: t("transaction.failed"),
    },
  };
}

export function CmsStatus<G extends keyof StatusMaps>({
  group,
  value,
}: {
  readonly group: G;
  readonly value: keyof StatusMaps[G] & string;
}) {
  const labels = useStatusLabels()[group] as Record<string, string>;
  const colors = COLORS[group] as Record<string, CmsBadgeColor>;
  return <CmsBadge color={colors[value]}>{labels[value]}</CmsBadge>;
}

/** Options for a status filter, in the order the map lists them. */
export function useStatusOptions<G extends keyof StatusMaps>(
  group: G,
): ReadonlyArray<{ readonly value: string; readonly label: string }> {
  const labels = useStatusLabels()[group] as Record<string, string>;
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

/* ------------------------------------------------- the API's own vocabularies */

/**
 * The same badges, for the API's enum literals.
 *
 * The maps above are the fixture vocabulary (`"active"`, `"pending"`); the admin
 * API answers in its own (`"ACTIVE"`, `"OPEN"`, `"PENDING_REVIEW"`). Rather than
 * lowercase a literal and hope it lands on a label — `OPEN` on a refund is
 * `refund.pending`, and `PENDING_REVIEW` on a flag is `report.open`, so it would
 * not — every literal is mapped here explicitly, once.
 *
 * Two literals have no label of their own in `cms.status.*`: a report's `ACTIONED`
 * and a flag's `CONFIRMED`. Rather than invent copy, both borrow
 * `cms.cases.tab.closed` ("ดำเนินการแล้ว"), which is the console's own words for
 * the same fact. `cms.status.report.actioned`, `cms.status.flag.confirmed` and
 * `cms.status.account.deleted` are the keys this would rather have; until they
 * exist an unmapped literal is printed verbatim in a neutral badge, because a
 * wrong Thai label is worse than a right English one.
 */
type ApiBadge = { readonly label: string; readonly color: CmsBadgeColor };

type ApiStatusMaps = {
  readonly accountStatus: Record<string, ApiBadge>;
  readonly role: Record<string, ApiBadge>;
  readonly identity: Record<string, ApiBadge>;
  readonly proof: Record<string, ApiBadge>;
  readonly refund: Record<string, ApiBadge>;
  readonly payout: Record<string, ApiBadge>;
  readonly report: Record<string, ApiBadge>;
  readonly flag: Record<string, ApiBadge>;
};

function useApiStatusMaps(): ApiStatusMaps {
  const labels = useStatusLabels();
  const closed = useTranslations("cms.cases")("tab.closed");

  return {
    accountStatus: {
      ACTIVE: { label: labels.account.active, color: "success" },
      SUSPENDED: { label: labels.account.suspended, color: "error" },
    },
    role: {
      admin: { label: labels.role.admin, color: "primary" },
      advisor: { label: labels.role.advisor, color: "action" },
      advisee: { label: labels.role.advisee, color: "neutral" },
    },
    identity: {
      NONE: { label: labels.identity.none, color: "neutral" },
      SUBMITTED: { label: labels.identity.submitted, color: "warning" },
      VERIFIED: { label: labels.identity.verified, color: "success" },
      REJECTED: { label: labels.identity.rejected, color: "error" },
    },
    proof: {
      PENDING: { label: labels.proof.pending, color: "warning" },
      APPROVED: { label: labels.proof.approved, color: "success" },
      REJECTED: { label: labels.proof.rejected, color: "error" },
    },
    refund: {
      // `OPEN`, not `PENDING` — the same state under the API's name for it.
      OPEN: { label: labels.refund.pending, color: "warning" },
      APPROVED: { label: labels.refund.approved, color: "success" },
      REJECTED: { label: labels.refund.rejected, color: "error" },
    },
    payout: {
      PENDING: { label: labels.payout.pending, color: "warning" },
      PAID: { label: labels.payout.paid, color: "success" },
      FAILED: { label: labels.payout.failed, color: "error" },
    },
    report: {
      OPEN: { label: labels.report.open, color: "warning" },
      ACTIONED: { label: closed, color: "info" },
      DISMISSED: { label: labels.report.dismissed, color: "neutral" },
    },
    flag: {
      PENDING_REVIEW: { label: labels.report.open, color: "warning" },
      CONFIRMED: { label: closed, color: "error" },
      DISMISSED: { label: labels.report.dismissed, color: "neutral" },
    },
  };
}

/** One API enum literal as a badge. An unmapped literal prints as itself. */
export function CmsApiStatus({
  group,
  value,
}: {
  readonly group: keyof ApiStatusMaps;
  readonly value: string | null;
}) {
  const maps = useApiStatusMaps();
  const badge = value === null ? undefined : maps[group][value];
  if (!badge) {
    return (
      <CmsBadge color="neutral">
        <span className="font-latin">{value ?? "—"}</span>
      </CmsBadge>
    );
  }
  return <CmsBadge color={badge.color}>{badge.label}</CmsBadge>;
}

/** Filter options over an API vocabulary, in the order given. */
export function useApiStatusOptions(
  group: keyof ApiStatusMaps,
  values: readonly string[],
): ReadonlyArray<{ readonly value: string; readonly label: string }> {
  const maps = useApiStatusMaps();
  return values.map((value) => ({
    value,
    label: maps[group][value]?.label ?? value,
  }));
}
