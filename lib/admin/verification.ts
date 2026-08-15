/**
 * Two review axes per ER.README: ADVISOR_IDENTITY (NONE→SUBMITTED→VERIFIED|
 * REJECTED) and per-document SKILL_PROOF_DOCUMENTS (PENDING/APPROVED/REJECTED,
 * proofLevel ladder). Queues shown on /admin/verification (+ /skills).
 */
export type IdentityRequest = {
  readonly id: string;
  readonly userId: string;
  readonly fullName: string;
  readonly birthDate: string;
  readonly submittedAt: string;
  readonly status: "SUBMITTED" | "VERIFIED" | "REJECTED";
};

export const identityRequests: ReadonlyArray<IdentityRequest> = [
  {
    id: "idv-2026-0812-001",
    userId: "john-minecraft",
    fullName: "จอห์น ไมน์คราฟต์",
    birthDate: "2067-07-06",
    submittedAt: "2026-08-12",
    status: "SUBMITTED",
  },
  {
    id: "idv-2026-0813-002",
    userId: "sarah-jenskins",
    fullName: "ซาร่า เจนสกินส์",
    birthDate: "1994-11-21",
    submittedAt: "2026-08-13",
    status: "SUBMITTED",
  },
  {
    id: "idv-2026-0813-003",
    userId: "christopher-line",
    fullName: "คริสโตเฟอร์ สาย",
    birthDate: "1990-02-14",
    submittedAt: "2026-08-13",
    status: "SUBMITTED",
  },
  {
    id: "idv-2026-0814-004",
    userId: "john-buyeronly",
    fullName: "จอห์น บายเออร์",
    birthDate: "1999-05-30",
    submittedAt: "2026-08-14",
    status: "SUBMITTED",
  },
  {
    id: "idv-2026-0814-005",
    userId: "john-minecraft",
    fullName: "จอห์น ไมน์คราฟต์",
    birthDate: "2067-07-06",
    submittedAt: "2026-08-14",
    status: "SUBMITTED",
  },
] as const;

export type SkillProof = {
  readonly id: string;
  readonly fullName: string;
  readonly skill: string;
  readonly documentName: string;
  readonly submittedAt: string;
  readonly status: "PENDING" | "APPROVED" | "REJECTED";
  readonly proofLevel:
    | "SELF_DECLARED"
    | "DOCUMENT_SUBMITTED"
    | "ADMIN_VERIFIED";
};

export const skillProofs: ReadonlyArray<SkillProof> = [
  {
    id: "skp-2026-0811-001",
    fullName: "จอห์น ไมน์คราฟต์",
    skill: "ระเบียบวิธีวิจัย",
    documentName: "cert-research-methods.pdf",
    submittedAt: "2026-08-11",
    status: "PENDING",
    proofLevel: "DOCUMENT_SUBMITTED",
  },
  {
    id: "skp-2026-0812-002",
    fullName: "ซาร่า เจนสกินส์",
    skill: "สถิติสำหรับงานวิจัย",
    documentName: "transcript-stats.pdf",
    submittedAt: "2026-08-12",
    status: "PENDING",
    proofLevel: "DOCUMENT_SUBMITTED",
  },
  {
    id: "skp-2026-0810-003",
    fullName: "ซาร่า เจนสกินส์",
    skill: "การเขียนบทความวิชาการ",
    documentName: "portfolio-writing.pdf",
    submittedAt: "2026-08-10",
    status: "APPROVED",
    proofLevel: "ADMIN_VERIFIED",
  },
] as const;
