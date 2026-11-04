import { describe, expect, it } from "vitest";

import { latestPerSkill, type ApiOwnSkillProof, type SkillProofReviewStatus } from "@/lib/api/onboarding";

function row(id: string, skillId: string, reviewStatus: SkillProofReviewStatus, createdAt: string): ApiOwnSkillProof {
  return {
    id,
    skillId,
    skillName: skillId.toUpperCase(),
    originalFileName: `${id}.pdf`,
    reviewStatus,
    rejectionReason: reviewStatus === "REJECTED" ? "ภาพไม่ชัด" : null,
    reviewedAt: null,
    createdAt,
  };
}

describe("latestPerSkill", () => {
  it("answers each skill once, as the document sent last stands", () => {
    const latest = latestPerSkill([
      row("a1", "a", "REJECTED", "2026-09-01T03:00:00.000Z"),
      row("b1", "b", "APPROVED", "2026-09-02T03:00:00.000Z"),
      row("a2", "a", "PENDING", "2026-10-01T03:00:00.000Z"),
    ]);
    expect(latest.map((proof) => [proof.id, proof.reviewStatus])).toEqual([
      ["a2", "PENDING"],
      ["b1", "APPROVED"],
    ]);
  });

  it("goes by when a document was sent, not where it sits in the list", () => {
    const latest = latestPerSkill([
      row("a2", "a", "PENDING", "2026-10-01T03:00:00.000Z"),
      row("a1", "a", "REJECTED", "2026-09-01T03:00:00.000Z"),
    ]);
    expect(latest.map((proof) => proof.id)).toEqual(["a2"]);
  });

  it("lets the later row decide when two were sent at the same instant", () => {
    const latest = latestPerSkill([
      row("a1", "a", "REJECTED", "2026-09-01T03:00:00.000Z"),
      row("a2", "a", "PENDING", "2026-09-01T03:00:00.000Z"),
    ]);
    expect(latest.map((proof) => proof.id)).toEqual(["a2"]);
  });

  it("answers nothing for nothing sent", () => {
    expect(latestPerSkill([])).toEqual([]);
  });
});
