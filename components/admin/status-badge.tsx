import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * ER status enums → Badge. Fixtures carry raw enum values ("HELD_IN_ESCROW");
 * the Thai display labels live in `admin.status.*`. Lookup objects, not
 * ternaries (Sonar house rule).
 */
export const adminStatuses = [
  "ACTIVE",
  "SUSPENDED",
  "SUBMITTED",
  "VERIFIED",
  "REJECTED",
  "PENDING",
  "APPROVED",
  "OPEN",
  "ACTIONED",
  "DISMISSED",
  "PAID",
  "FAILED",
  "HELD_IN_ESCROW",
  "RELEASED",
  "REFUNDED",
] as const;

export type AdminStatus = (typeof adminStatuses)[number];

const LABEL_KEYS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  SUBMITTED: "submitted",
  VERIFIED: "verified",
  REJECTED: "rejected",
  PENDING: "pending",
  APPROVED: "approved",
  OPEN: "open",
  ACTIONED: "actioned",
  DISMISSED: "dismissed",
  PAID: "paid",
  FAILED: "failed",
  HELD_IN_ESCROW: "heldInEscrow",
  RELEASED: "released",
  REFUNDED: "refunded",
} as const satisfies Record<AdminStatus, string>;

type Tone = "positive" | "negative" | "waiting" | "neutral";

const TONES: Record<AdminStatus, Tone> = {
  ACTIVE: "positive",
  SUSPENDED: "negative",
  SUBMITTED: "waiting",
  VERIFIED: "positive",
  REJECTED: "negative",
  PENDING: "waiting",
  APPROVED: "positive",
  OPEN: "waiting",
  ACTIONED: "positive",
  DISMISSED: "neutral",
  PAID: "positive",
  FAILED: "negative",
  HELD_IN_ESCROW: "waiting",
  RELEASED: "positive",
  REFUNDED: "neutral",
};

const TONE_CLASSES: Record<Tone, string> = {
  positive: "border-transparent bg-success-surface text-success",
  negative: "",
  waiting: "",
  neutral: "",
};

const TONE_VARIANTS = {
  positive: "outline",
  negative: "destructive",
  waiting: "secondary",
  neutral: "outline",
} as const;

export function StatusBadge({ status }: { readonly status: AdminStatus }) {
  const t = useTranslations("admin");
  const tone = TONES[status];

  return (
    <Badge className={cn(TONE_CLASSES[tone])} variant={TONE_VARIANTS[tone]}>
      {t(`status.${LABEL_KEYS[status]}`)}
    </Badge>
  );
}
