import Link from "next/link";
import { useTranslations } from "next-intl";

import { skillProofs, type SkillProof } from "@/lib/admin/verification";
import { Button } from "@/components/ui/button";
import { AdminContent } from "@/components/admin/shell";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  CaseActionBar,
  CaseDetail,
  CaseLayout,
  CaseQueue,
  CaseSection,
} from "@/components/admin/case-layout";
import { DataField, DataFieldGroup } from "@/components/admin/data-field";
import { EvidenceGrid } from "@/components/admin/evidence-grid";
import { QueueCard } from "@/components/admin/queue-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { TabLinkNav } from "@/components/admin/tab-link-nav";

const PROOF_LEVEL_KEYS = {
  SELF_DECLARED: "verification.proofSelfDeclared",
  DOCUMENT_SUBMITTED: "verification.proofDocSubmitted",
  ADMIN_VERIFIED: "verification.proofAdminVerified",
} as const satisfies Record<SkillProof["proofLevel"], string>;

/**
 * Skill-proof review desk — sibling tab of the identity desk (Figma
 * 1042:15142 "ยืนยันตัวตน"). No dedicated wireframe exists: the ER's two-axis
 * verification rule (identity vs per-skill SKILL_PROOF_DOCUMENTS) implies this
 * second queue, so it reuses the same case-desk archetype with proof-level
 * fields in place of identity fields.
 */
export function SkillProofsScreen({
  state = "default",
}: {
  readonly state?: "default" | "approved";
}) {
  const t = useTranslations("admin");
  const approved = state === "approved";
  const selected = skillProofs.find((row) => row.status === "PENDING") ?? skillProofs[0];
  const proofLevel = approved ? "ADMIN_VERIFIED" : selected.proofLevel;

  return (
    <AdminContent className="max-w-none flex-1">
      <AdminPageHeader
        description={t("verification.description")}
        title={t("verification.title")}
      />
      <TabLinkNav
        tabs={[
          { href: "/admin/verification", label: t("verification.tabIdentity") },
          {
            active: true,
            href: "/admin/verification/skills",
            label: t("verification.tabSkills"),
          },
        ]}
      />
      <CaseLayout>
        <CaseQueue title={t("common.queueTitle")}>
          {skillProofs.map((row) => (
            <QueueCard
              avatarName={row.fullName}
              badge={queueBadge(row, row.id === selected.id && approved)}
              href="/admin/verification/skills"
              key={row.id}
              selected={row.id === selected.id}
              subtitle={row.fullName}
              title={row.skill}
            />
          ))}
        </CaseQueue>
        <CaseDetail>
          <CaseSection title={t("common.attachedDocs")}>
            {/* Same wide document frame as the identity desk — widen the
                single EvidenceGrid thumbnail past its 256px thumbnail cap. */}
            <div className="flex w-full max-w-2xl flex-col gap-2 [&>div>div]:max-w-2xl">
              <EvidenceGrid count={1} />
              <p className="font-latin text-sm text-muted-foreground">
                {selected.documentName}
              </p>
            </div>
          </CaseSection>
          <CaseSection title={t("verification.userDetails")}>
            <DataFieldGroup>
              <DataField label={t("verification.skillLabel")} value={selected.skill} />
              <DataField
                label={t("verification.proofLevelLabel")}
                value={t(PROOF_LEVEL_KEYS[proofLevel])}
              />
            </DataFieldGroup>
          </CaseSection>
          {approved ? (
            <div className="w-full rounded-lg bg-success-surface px-4 py-3 text-sm text-success">
              {t("verification.approvedNote")}
            </div>
          ) : null}
          <CaseActionBar>
            <Button
              className="w-40"
              render={<Link href="/admin/verification/skills" />}
          nativeButton={false}
              variant="destructive"
            >
              {t("common.reject")}
            </Button>
            <Button
              className="w-40"
              render={<Link href="/admin/verification/skills/approved" />}
          nativeButton={false}
            >
              {t("common.approve")}
            </Button>
          </CaseActionBar>
        </CaseDetail>
      </CaseLayout>
    </AdminContent>
  );
}

/** PENDING rows carry no badge; the approved state promotes the open case. */
function queueBadge(row: SkillProof, promoted: boolean) {
  const status = promoted ? "APPROVED" : row.status;
  if (status === "PENDING") {
    return undefined;
  }
  return <StatusBadge status={status} />;
}
