"use client";

import { useTranslations } from "next-intl";

import { CmsBadge, type CmsBadgeColor } from "@/components/cms/badge";

/**
 * Every status the console prints, keyed by the API's own enum literals
 * (`"OPEN"`, `"PENDING_REVIEW"`, `"SUSPENDED"`), with its colour here and its
 * words under `cms.status.<group>.<literal>`.
 *
 * Keyed by the literal rather than by a vocabulary of the console's own, so
 * nothing has to translate between the two: `OPEN` on a refund and
 * `PENDING_REVIEW` on a flag are both simply "waiting", each under its own
 * group. A literal the map does not know yet is printed as itself in a
 * neutral pill, because a wrong Thai label is worse than a right English one.
 *
 * `publish` is the one group the API has no enum for: a service carries
 * `isPublished`, which the screens turn into `published` or `hidden`.
 */
const COLORS = {
  account: { ACTIVE: "success", SUSPENDED: "error", DELETED: "neutral" },
  role: { admin: "primary", advisor: "action", advisee: "neutral" },
  identity: { NONE: "neutral", SUBMITTED: "warning", VERIFIED: "success", REJECTED: "error" },
  proof: { PENDING: "warning", APPROVED: "success", REJECTED: "error" },
  publish: { published: "success", hidden: "neutral" },
  refund: { OPEN: "warning", APPROVED: "success", REJECTED: "error" },
  payout: { PENDING: "warning", PAID: "success", FAILED: "error" },
  report: { OPEN: "warning", ACTIONED: "info", DISMISSED: "neutral" },
  flag: { PENDING_REVIEW: "warning", CONFIRMED: "error", DISMISSED: "neutral" },
} as const satisfies Record<string, Record<string, CmsBadgeColor>>;

export type CmsStatusGroup = keyof typeof COLORS;

/** The label of one literal, or the literal itself when there is none. */
export function useStatusLabel(): (group: CmsStatusGroup, value: string | null) => string {
  const t = useTranslations("cms.status");
  return (group, value) => {
    if (value === null) return "-";
    const key = `${group}.${value}`;
    return value in COLORS[group] ? t(key as "account.ACTIVE") : value;
  };
}

/** One status as a pill. */
export function CmsStatus({
  group,
  value,
}: {
  readonly group: CmsStatusGroup;
  readonly value: string | null;
}) {
  const label = useStatusLabel();
  const colors: Record<string, CmsBadgeColor> = COLORS[group];
  const color = value === null ? undefined : colors[value];
  if (!color) {
    return (
      <CmsBadge color="neutral">
        <span className="font-latin">{value ?? "-"}</span>
      </CmsBadge>
    );
  }
  return <CmsBadge color={color}>{label(group, value)}</CmsBadge>;
}

/** Filter options over one group's literals, in the order given. */
export function useStatusOptions(
  group: CmsStatusGroup,
  values: readonly string[],
): ReadonlyArray<{ readonly value: string; readonly label: string }> {
  const label = useStatusLabel();
  return values.map((value) => ({ value, label: label(group, value) }));
}
