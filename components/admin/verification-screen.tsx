import Link from "next/link";
import { CircleAlert, CircleCheck, Inbox, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { identityRequests } from "@/lib/admin/verification";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { TabLinkNav } from "@/components/admin/tab-link-nav";
import { cn } from "@/lib/utils";

type VerificationState = "default" | "reject" | "approved" | "rejected" | "empty";

/** Outcome states decorate the open case with a badge + note bar. */
const OUTCOME_BADGE: Partial<Record<VerificationState, AdminStatus>> = {
  approved: "VERIFIED",
  rejected: "REJECTED",
};

const OUTCOME_NOTE: Partial<
  Record<
    VerificationState,
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
 * Identity verification desk — Figma "ยืนยันตัวตน" (1042:15142). Left queue of
 * identity requests, right document viewer + read-only user details, footer
 * reject/approve. Outcome routes (/approved, /rejected) re-render the desk with
 * a note bar and status badge; /reject overlays the reason dialog. CaseLayout
 * itself is the Card surface, so the tab strip stays above it on the canvas.
 */
export function VerificationScreen({
  state = "default",
}: {
  readonly state?: VerificationState;
}) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const selected = identityRequests[0];
  const badge = OUTCOME_BADGE[state];
  const note = OUTCOME_NOTE[state];

  return (
    <AdminContent className="max-w-none flex-1">
      <AdminPageHeader
        description={t("verification.description")}
        title={t("verification.title")}
      />
      <TabLinkNav
        tabs={[
          {
            href: "/admin/verification",
            label: t("verification.tabIdentity"),
            active: true,
          },
          {
            href: "/admin/verification/skills",
            label: t("verification.tabSkills"),
          },
        ]}
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
            {identityRequests.map((request, index) => (
              <QueueCard
                avatarName={request.fullName}
                badge={
                  index === 0 && badge ? <StatusBadge status={badge} /> : undefined
                }
                href="/admin/verification"
                key={request.id}
                selected={index === 0}
                subtitle={format.dateTime(new Date(request.submittedAt), "short")}
                title={request.fullName}
              />
            ))}
          </CaseQueue>

          <CaseDetail>
            <CaseSection title={t("common.attachedDocs")}>
              {/* Wireframe shows one large 720x480 document frame — widen the
                  single EvidenceGrid thumbnail past its 256px thumbnail cap so
                  the document under review stays the dominant element. */}
              <div className="w-full max-w-2xl [&>div>div]:max-w-2xl">
                <EvidenceGrid count={1} />
              </div>
            </CaseSection>

            <CaseSection title={t("verification.userDetails")}>
              <DataFieldGroup>
                <DataField
                  label={t("verification.nameLabel")}
                  value={selected.fullName}
                />
                <DataField
                  label={t("verification.birthDateLabel")}
                  value={format.dateTime(new Date(selected.birthDate), "short")}
                />
              </DataFieldGroup>
            </CaseSection>

            {note ? (
              <div
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium",
                  note.className,
                )}
              >
                <note.icon aria-hidden className="size-4 shrink-0" />
                {t(`verification.${note.key}`)}
              </div>
            ) : null}

            <CaseActionBar>
              <Button
                className="w-40"
                render={<Link href="/admin/verification/reject" />}
          nativeButton={false}
                variant="destructive"
              >
                {t("common.reject")}
              </Button>
              <Button
                className="w-40"
                render={<Link href="/admin/verification/approved" />}
          nativeButton={false}
              >
                {t("common.approve")}
              </Button>
            </CaseActionBar>
          </CaseDetail>
        </CaseLayout>
      )}

      {state === "reject" ? (
        <AdminConfirmDialog
          body={t("common.reasonPlaceholder")}
          cancelHref="/admin/verification"
          cancelLabel={t("common.cancel")}
          confirmHref="/admin/verification/rejected"
          confirmLabel={t("common.reject")}
          destructive
          title={t("verification.rejectDialogTitle")}
        >
          <Label htmlFor="verification-reject-reason">
            {t("common.reasonLabel")}
          </Label>
          <Textarea
            id="verification-reject-reason"
            placeholder={t("common.reasonPlaceholder")}
          />
        </AdminConfirmDialog>
      ) : null}
    </AdminContent>
  );
}
