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
