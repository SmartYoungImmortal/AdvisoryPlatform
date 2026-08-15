import Link from "next/link";
import { CircleAlert, CircleCheck, Inbox, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { refundCases } from "@/lib/admin/refunds";
import { satangToBaht } from "@/lib/admin/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CaseActionBar,
  CaseDetail,
  CaseLayout,
  CaseQueue,
  CaseSection,
} from "@/components/admin/case-layout";
import { AdminConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataField } from "@/components/admin/data-field";
import { EvidenceGrid } from "@/components/admin/evidence-grid";
import { AdminPageHeader } from "@/components/admin/page-header";
import { QueueCard } from "@/components/admin/queue-card";
import { AdminContent } from "@/components/admin/shell";
import { StatusBadge, type AdminStatus } from "@/components/admin/status-badge";
import { cn } from "@/lib/utils";

type RefundState = "default" | "approve" | "approved" | "rejected" | "empty";

/** Outcome states decorate the open case with a badge + note bar. */
const OUTCOME_BADGE: Partial<Record<RefundState, AdminStatus>> = {
  approved: "APPROVED",
  rejected: "REJECTED",
};

const OUTCOME_NOTE: Partial<
  Record<
    RefundState,
    {
      readonly key: "approvedNote" | "rejectedNote";
      readonly className: string;
      readonly icon: LucideIcon;
    }
  >
> = {
  approved: {
    key: "approvedNote",
    className: "bg-success-surface text-success",
    icon: CircleCheck,
  },
  rejected: {
    key: "rejectedNote",
    className: "bg-destructive/10 text-destructive",
    icon: CircleAlert,
  },
};

/**
 * Refund case desk — Figma "คำขอคืนเงิน" (1042:15191). Left queue of refund
 * requests (reason + service), right read-only request details + attached
 * evidence, footer deny/refund. Outcome routes (/approved, /rejected)
 * re-render the desk with a note bar and status badge; /approve overlays the
 * refund confirmation dialog. CaseLayout itself is the Card surface on the
 * tinted canvas, so the screen adds no outer frame of its own.
 */
export function RefundsScreen({
  state = "default",
}: {
  readonly state?: RefundState;
}) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const selected = refundCases[0];
  const badge = OUTCOME_BADGE[state];
  const note = OUTCOME_NOTE[state];

  return (
    <AdminContent className="max-w-none flex-1">
      <AdminPageHeader
        description={t("refunds.description")}
        title={t("refunds.title")}
      />

      {state === "empty" ? (
        <Card className="flex w-full flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Inbox aria-hidden className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xl font-semibold text-foreground">
              {t("common.emptyTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("common.emptyBody")}
            </p>
          </div>
        </Card>
      ) : (
        <CaseLayout>
          <CaseQueue title={t("common.queueTitle")}>
            {refundCases.map((refund, index) => (
              <QueueCard
                badge={
                  index === 0 && badge ? <StatusBadge status={badge} /> : undefined
                }
                href="/admin/refunds"
                key={refund.id}
                selected={index === 0}
                subtitle={<span className="font-latin">{refund.service}</span>}
                title={refund.reason}
              />
            ))}
          </CaseQueue>

          <CaseDetail>
            <CaseSection title={t("refunds.detailTitle")}>
              {/* Wireframe shows full-width fields — DataFieldGroup caps at
                  max-w-md, so wrap the fields in a plain column instead. */}
              <div className="flex w-full flex-col gap-3">
                <DataField
                  label={t("refunds.reasonLabel")}
                  value={selected.reason}
                />
                <DataField
                  label={t("refunds.detailLabel")}
                  value={selected.detail}
                />
                <DataField
                  label={t("refunds.amountLabel")}
                  value={format.number(satangToBaht(selected.amountSatang), "baht")}
                />
                <DataField
                  label={t("refunds.serviceLabel")}
                  value={<span className="font-latin">{selected.service}</span>}
                />
              </div>
            </CaseSection>

            <CaseSection title={t("common.attachedEvidence")}>
              <EvidenceGrid count={selected.evidenceCount} />
            </CaseSection>

            {note ? (
              <div
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium",
                  note.className,
                )}
              >
                <note.icon aria-hidden className="size-4 shrink-0" />
                {t(`refunds.${note.key}`)}
              </div>
            ) : null}

            <CaseActionBar>
              <Button
                className="w-40"
                render={<Link href="/admin/refunds/rejected" />}
          nativeButton={false}
                variant="destructive"
              >
                {t("refunds.deny")}
              </Button>
              <Button
                className="w-40"
                render={<Link href="/admin/refunds/approve" />}
          nativeButton={false}
              >
                {t("refunds.refund")}
              </Button>
            </CaseActionBar>
          </CaseDetail>
        </CaseLayout>
      )}

      {state === "approve" ? (
        <AdminConfirmDialog
          body={t("refunds.approveDialogBody")}
          cancelHref="/admin/refunds"
          cancelLabel={t("common.cancel")}
          confirmHref="/admin/refunds/approved"
          confirmLabel={t("refunds.refund")}
          title={t("refunds.approveDialogTitle")}
        />
      ) : null}
    </AdminContent>
  );
}
