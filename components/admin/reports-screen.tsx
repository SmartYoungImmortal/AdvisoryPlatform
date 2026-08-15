import Link from "next/link";
import { Ban, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { userReports, type UserReport } from "@/lib/admin/reports";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CaseActionBar,
  CaseDetail,
  CaseLayout,
  CaseQueue,
  CaseSection,
} from "@/components/admin/case-layout";
import { AdminConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataField, DataFieldGroup } from "@/components/admin/data-field";
import { EvidenceGrid } from "@/components/admin/evidence-grid";
import { AdminPageHeader } from "@/components/admin/page-header";
import { QueueCard } from "@/components/admin/queue-card";
import { AdminContent } from "@/components/admin/shell";
import { StatusBadge, type AdminStatus } from "@/components/admin/status-badge";

type ReportsState = "default" | "suspend" | "suspended" | "dismissed";

/** Wireframe cards read literal English category names — Latin-only runs. */
const CATEGORY_LABELS: Record<UserReport["category"], string> = {
  "off-platform": "Off-platform",
  harassment: "Harassment",
  scam: "Scam",
};

const RISK_KEYS: Record<UserReport["risk"], "riskLow" | "riskHigh"> = {
  LOW: "riskLow",
  HIGH: "riskHigh",
};

/** Outcome states decorate the open case with a badge + note bar. */
const OUTCOME_BADGE: Partial<Record<ReportsState, AdminStatus>> = {
  suspended: "ACTIONED",
  dismissed: "DISMISSED",
};

const OUTCOME_NOTE: Partial<
  Record<
    ReportsState,
    {
      readonly key: "suspendedNote" | "dismissedNote";
      readonly className: string;
      readonly icon: typeof Ban;
    }
  >
> = {
  suspended: {
    key: "suspendedNote",
    className: "bg-destructive/10 text-destructive",
    icon: Ban,
  },
  dismissed: {
    key: "dismissedNote",
    className: "bg-muted text-muted-foreground",
    icon: Trash2,
  },
};

/**
 * Report case desk — Figma "รายงาน" (1042:15219). Left queue of user reports
 * ("Off-platform (เสี่ยงต่ำ)" cards), right detail column with category,
 * reported user, evidence strip, and chat-log excerpt; footer dismiss/suspend.
 * Outcome routes (/suspended, /dismissed) re-render the desk with a note bar
 * and status badge; /suspend overlays the severity dialog.
 */
export function ReportsScreen({
  state = "default",
}: {
  readonly state?: ReportsState;
}) {
  const t = useTranslations("admin");
  const selected = userReports[0];
  const badge = OUTCOME_BADGE[state];
  const note = OUTCOME_NOTE[state];

  const severityItems = [
    { value: "warning-tier", label: t("reports.severityWarning") },
    { value: "suspend-tier", label: t("reports.severitySuspend") },
    { value: "ban-tier", label: t("reports.severityBan") },
  ];

  const categoryTitle = (report: UserReport): ReactNode => (
    <span>
      <span className="font-latin">{CATEGORY_LABELS[report.category]}</span> (
      {t(`reports.${RISK_KEYS[report.risk]}`)})
    </span>
  );

  return (
    <AdminContent className="max-w-none flex-1">
      <AdminPageHeader
        description={t("reports.description")}
        title={t("reports.title")}
      />

      <CaseLayout>
        <CaseQueue title={t("reports.queueTitle")}>
          {userReports.map((report, index) => (
            <QueueCard
              avatarName={report.reportedUser}
              badge={
                index === 0 && badge ? <StatusBadge status={badge} /> : undefined
              }
              href="/admin/reports"
              key={report.id}
              selected={index === 0}
              subtitle={
                <span className="font-latin">{report.reportedUser}</span>
              }
              title={categoryTitle(report)}
            />
          ))}
        </CaseQueue>

        <CaseDetail>
          <CaseSection title={t("reports.detailTitle")}>
            <DataFieldGroup>
              <DataField
                label={t("reports.categoryLabel")}
                value={categoryTitle(selected)}
              />
              <DataField
                label={t("reports.reportedUserLabel")}
                value={
                  <span className="font-latin">{selected.reportedUser}</span>
                }
              />
            </DataFieldGroup>
          </CaseSection>

          <CaseSection title={t("common.attachedEvidence")}>
            <EvidenceGrid count={selected.evidenceCount} />
          </CaseSection>

          <CaseSection
            title={
              <span className="font-latin">{t("reports.chatLogLabel")}</span>
            }
          >
            {/* Quoted excerpt — a muted inset on the Card surface, no extra
                border now that CaseLayout itself is the Card. */}
            <div className="w-full max-w-md rounded-lg bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              {selected.chatLog}
            </div>
          </CaseSection>

          {note ? (
            <div
              className={`flex w-full items-start gap-2.5 rounded-lg px-4 py-3 text-sm font-medium ${note.className}`}
            >
              <note.icon aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{t(`reports.${note.key}`)}</span>
            </div>
          ) : null}

          <CaseActionBar>
            <Button
              className="w-40"
              render={<Link href="/admin/reports/dismissed" />}
          nativeButton={false}
              variant="outline"
            >
              <Trash2 />
              {t("reports.dismiss")}
            </Button>
            <Button
              className="w-40"
              render={<Link href="/admin/reports/suspend" />}
          nativeButton={false}
              variant="destructive"
            >
              <Ban />
              {t("reports.suspendAccount")}
            </Button>
          </CaseActionBar>
        </CaseDetail>
      </CaseLayout>

      {state === "suspend" ? (
        <AdminConfirmDialog
          destructive
          body={t("userDetail.suspendDialogBody")}
          cancelHref="/admin/reports"
          cancelLabel={t("common.cancel")}
          confirmHref="/admin/reports/suspended"
          confirmLabel={t("reports.suspendAccount")}
          title={t("reports.suspendDialogTitle")}
        >
          <Field>
            <FieldLabel htmlFor="report-suspend-severity">
              {t("reports.severityLabel")}
            </FieldLabel>
            <Select defaultValue="suspend-tier" items={severityItems}>
              <SelectTrigger className="w-full" id="report-suspend-severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </AdminConfirmDialog>
      ) : null}
    </AdminContent>
  );
}
