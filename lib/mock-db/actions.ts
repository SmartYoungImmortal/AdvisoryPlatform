import { newId, nowIso, updateDatabase, withAudit } from "@/lib/mock-db/store";
import type {
  Account,
  AdvisorLevel,
  Category,
  Database,
  Decision,
  MarketService,
  PublishStatus,
  ReportStatus,
  Skill,
} from "@/lib/mock-db/types";

/**
 * Every write the console makes. Each one records who did it in `audit`, the
 * way the API's decision columns will, and returns nothing a screen has to
 * thread back: screens re-render from the store.
 */

function decision(actorId: string, note: string | null): Decision {
  return { at: nowIso(), by: actorId, note: note?.trim() || null };
}

function patchAccount(
  db: Database,
  id: string,
  patch: (account: Account) => Partial<Account>,
): Database {
  return {
    ...db,
    accounts: db.accounts.map((a) =>
      a.id === id ? { ...a, ...patch(a), updatedAt: nowIso() } : a,
    ),
  };
}

// ── Accounts ──────────────────────────────────────────────────────────────

export function suspendAccounts(
  ids: readonly string[],
  reason: string,
  until: string | null,
  actorId: string,
): void {
  updateDatabase((db) => {
    let next = db;
    for (const id of ids) {
      if (id === actorId) continue; // An admin cannot lock themselves out.
      next = patchAccount(next, id, () => ({
        status: "suspended",
        suspension: { reason, until, at: nowIso(), by: actorId },
      }));
      next = withAudit(next, { actorId, action: "account.suspend", targetId: id, summary: reason });
    }
    return next;
  });
}

export function reinstateAccount(id: string, actorId: string): void {
  updateDatabase((db) =>
    withAudit(
      patchAccount(db, id, () => ({ status: "active", suspension: null, failedLogins: 0 })),
      { actorId, action: "account.reinstate", targetId: id, summary: "" },
    ),
  );
}

export function updateAccountDetails(
  id: string,
  patch: Partial<Pick<Account, "name" | "fullName" | "email" | "phone">>,
  actorId: string,
): void {
  updateDatabase((db) =>
    withAudit(
      patchAccount(db, id, () => patch),
      { actorId, action: "account.update", targetId: id, summary: Object.keys(patch).join(", ") },
    ),
  );
}

// ── Verification ──────────────────────────────────────────────────────────

export function approveIdentity(
  requestId: string,
  level: AdvisorLevel,
  note: string | null,
  actorId: string,
): void {
  updateDatabase((db) => {
    const request = db.identityRequests.find((r) => r.id === requestId);
    if (!request) return db;
    const next: Database = {
      ...db,
      identityRequests: db.identityRequests.map((r) =>
        r.id === requestId ? { ...r, status: "verified", decision: decision(actorId, note) } : r,
      ),
      // The review page lists the applicant's proofs beside the approve button,
      // so approving the advisor approves what was reviewed with them.
      skillProofs: db.skillProofs.map((p) =>
        p.accountId === request.accountId && p.status === "pending"
          ? { ...p, status: "approved", decision: decision(actorId, null) }
          : p,
      ),
    };
    // Approval is what makes an applicant an advisor.
    const upgraded = patchAccount(next, request.accountId, (account) => ({
      role: account.role === "admin" ? "admin" : "advisor",
      fullName: request.fullName,
      advisor: {
        field: request.field,
        credential: request.credential,
        identity: "verified",
        level,
        rating: account.advisor?.rating ?? 0,
        catalogueId: account.advisor?.catalogueId ?? null,
      },
    }));
    return withAudit(upgraded, {
      actorId,
      action: "identity.approve",
      targetId: requestId,
      summary: `level ${level}`,
    });
  });
}

export function rejectIdentity(requestId: string, note: string, actorId: string): void {
  updateDatabase((db) => {
    const request = db.identityRequests.find((r) => r.id === requestId);
    if (!request) return db;
    const next: Database = {
      ...db,
      identityRequests: db.identityRequests.map((r) =>
        r.id === requestId ? { ...r, status: "rejected", decision: decision(actorId, note) } : r,
      ),
    };
    const updated = patchAccount(next, request.accountId, (account) => ({
      advisor: account.advisor ? { ...account.advisor, identity: "rejected" } : null,
    }));
    return withAudit(updated, { actorId, action: "identity.reject", targetId: requestId, summary: note });
  });
}

export function decideSkillProofs(
  ids: readonly string[],
  status: "approved" | "rejected",
  note: string | null,
  actorId: string,
): void {
  updateDatabase((db) => {
    const next: Database = {
      ...db,
      skillProofs: db.skillProofs.map((p) =>
        ids.includes(p.id) ? { ...p, status, decision: decision(actorId, note) } : p,
      ),
    };
    return ids.reduce(
      (acc, id) =>
        withAudit(acc, {
          actorId,
          action: status === "approved" ? "proof.approve" : "proof.reject",
          targetId: id,
          summary: note ?? "",
        }),
      next,
    );
  });
}

// ── Marketplace ───────────────────────────────────────────────────────────

export function setServicesStatus(
  ids: readonly string[],
  status: PublishStatus,
  reason: string | null,
  actorId: string,
): void {
  updateDatabase((db) => {
    const next: Database = {
      ...db,
      services: db.services.map((s) =>
        ids.includes(s.id)
          ? {
              ...s,
              status,
              hiddenReason: status === "hidden" ? (reason?.trim() || null) : null,
              updatedAt: nowIso(),
            }
          : s,
      ),
    };
    return ids.reduce(
      (acc, id) =>
        withAudit(acc, {
          actorId,
          action: status === "hidden" ? "service.hide" : "service.publish",
          targetId: id,
          summary: reason ?? "",
        }),
      next,
    );
  });
}

export function updateService(
  id: string,
  patch: Partial<Pick<MarketService, "title" | "categoryId" | "priceSatang" | "minutes">>,
  actorId: string,
): void {
  updateDatabase((db) =>
    withAudit(
      {
        ...db,
        services: db.services.map((s) =>
          s.id === id ? { ...s, ...patch, updatedAt: nowIso() } : s,
        ),
      },
      { actorId, action: "service.update", targetId: id, summary: Object.keys(patch).join(", ") },
    ),
  );
}

export function slugify(value: string): string {
  const ascii = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return ascii || newId("cat").toLowerCase();
}

export function saveCategory(
  input: Pick<Category, "name" | "slug" | "status"> & { readonly id?: string },
  actorId: string,
): string {
  const id = input.id ?? `cat-${input.slug}`;
  updateDatabase((db) => {
    const exists = db.categories.some((c) => c.id === input.id);
    const at = nowIso();
    const categories = exists
      ? db.categories.map((c) =>
          c.id === input.id
            ? { ...c, name: input.name, slug: input.slug, status: input.status, updatedAt: at }
            : c,
        )
      : [
          ...db.categories,
          { id, name: input.name, slug: input.slug, status: input.status, createdAt: at, updatedAt: at },
        ];
    return withAudit(
      { ...db, categories },
      { actorId, action: exists ? "category.update" : "category.create", targetId: id, summary: input.name },
    );
  });
  return id;
}

/**
 * Nexus's delete guard, strict form: a category that services still point at
 * cannot go. The caller shows the count and a way to the linked services.
 */
export function categoryUsage(db: Database, categoryId: string): number {
  return db.services.filter((s) => s.categoryId === categoryId).length;
}

export function deleteCategories(ids: readonly string[], actorId: string): readonly string[] {
  const blocked: string[] = [];
  updateDatabase((db) => {
    const removable = ids.filter((id) => {
      const used = categoryUsage(db, id) > 0;
      if (used) blocked.push(id);
      return !used;
    });
    const next: Database = {
      ...db,
      categories: db.categories.filter((c) => !removable.includes(c.id)),
      skills: db.skills.filter((s) => !removable.includes(s.categoryId)),
    };
    return removable.reduce(
      (acc, id) => withAudit(acc, { actorId, action: "category.delete", targetId: id, summary: "" }),
      next,
    );
  });
  return blocked;
}

export function saveSkill(
  input: Pick<Skill, "name" | "categoryId"> & { readonly id?: string },
  actorId: string,
): void {
  updateDatabase((db) => {
    const at = nowIso();
    const exists = db.skills.some((s) => s.id === input.id);
    const id = input.id ?? newId("skill");
    const skills = exists
      ? db.skills.map((s) =>
          s.id === input.id ? { ...s, name: input.name, categoryId: input.categoryId, updatedAt: at } : s,
        )
      : [...db.skills, { id, name: input.name, categoryId: input.categoryId, createdAt: at, updatedAt: at }];
    return withAudit(
      { ...db, skills },
      { actorId, action: exists ? "skill.update" : "skill.create", targetId: id, summary: input.name },
    );
  });
}

export function deleteSkills(ids: readonly string[], actorId: string): void {
  updateDatabase((db) =>
    ids.reduce<Database>(
      (acc, id) => withAudit(acc, { actorId, action: "skill.delete", targetId: id, summary: "" }),
      { ...db, skills: db.skills.filter((s) => !ids.includes(s.id)) },
    ),
  );
}

// ── Refunds ───────────────────────────────────────────────────────────────

export function approveRefund(
  id: string,
  refundedSatang: number,
  note: string | null,
  actorId: string,
): void {
  updateDatabase((db) =>
    withAudit(
      {
        ...db,
        refunds: db.refunds.map((r) =>
          r.id === id
            ? { ...r, status: "approved", refundedSatang, decision: decision(actorId, note) }
            : r,
        ),
      },
      { actorId, action: "refund.approve", targetId: id, summary: String(refundedSatang) },
    ),
  );
}

export function rejectRefunds(ids: readonly string[], note: string, actorId: string): void {
  updateDatabase((db) =>
    ids.reduce<Database>(
      (acc, id) => withAudit(acc, { actorId, action: "refund.reject", targetId: id, summary: note }),
      {
        ...db,
        refunds: db.refunds.map((r) =>
          ids.includes(r.id)
            ? { ...r, status: "rejected" as const, refundedSatang: null, decision: decision(actorId, note) }
            : r,
        ),
      },
    ),
  );
}

// ── Reports and off-platform flags ────────────────────────────────────────

export type Resolution = Exclude<ReportStatus, "open">;

const SUSPENSION_DAYS = 30;

function suspensionUntil(): string {
  return new Date(Date.now() + SUSPENSION_DAYS * 86_400_000).toISOString();
}

/** A `suspended` resolution suspends the account the case is about, too. */
function applyResolution(
  db: Database,
  accountId: string,
  resolution: Resolution,
  note: string | null,
  actorId: string,
): Database {
  if (resolution !== "suspended" || accountId === actorId) return db;
  return patchAccount(db, accountId, () => ({
    status: "suspended",
    suspension: {
      reason: note?.trim() || "ละเมิดข้อกำหนดการใช้งาน",
      until: suspensionUntil(),
      at: nowIso(),
      by: actorId,
    },
  }));
}

export function resolveReports(
  ids: readonly string[],
  resolution: Resolution,
  note: string | null,
  actorId: string,
): void {
  updateDatabase((db) => {
    let next: Database = {
      ...db,
      reports: db.reports.map((r) =>
        ids.includes(r.id) ? { ...r, status: resolution, decision: decision(actorId, note) } : r,
      ),
    };
    for (const report of db.reports.filter((r) => ids.includes(r.id))) {
      next = applyResolution(next, report.reportedId, resolution, note, actorId);
      next = withAudit(next, {
        actorId,
        action: `report.${resolution}`,
        targetId: report.id,
        summary: note ?? "",
      });
    }
    return next;
  });
}

export function resolveFlags(
  ids: readonly string[],
  resolution: Resolution,
  note: string | null,
  actorId: string,
): void {
  updateDatabase((db) => {
    let next: Database = {
      ...db,
      offPlatformFlags: db.offPlatformFlags.map((f) =>
        ids.includes(f.id) ? { ...f, status: resolution, decision: decision(actorId, note) } : f,
      ),
    };
    for (const flag of db.offPlatformFlags.filter((f) => ids.includes(f.id))) {
      next = applyResolution(next, flag.senderId, resolution, note, actorId);
      next = withAudit(next, {
        actorId,
        action: `flag.${resolution}`,
        targetId: flag.id,
        summary: note ?? "",
      });
    }
    return next;
  });
}

// ── Payouts ───────────────────────────────────────────────────────────────

export function markPayoutsPaid(ids: readonly string[], actorId: string): void {
  updateDatabase((db) =>
    ids.reduce<Database>(
      (acc, id) => withAudit(acc, { actorId, action: "payout.paid", targetId: id, summary: "" }),
      {
        ...db,
        payouts: db.payouts.map((p) =>
          ids.includes(p.id)
            ? { ...p, status: "paid" as const, paidAt: nowIso(), failureReason: null }
            : p,
        ),
      },
    ),
  );
}

export function markPayoutFailed(id: string, reason: string, actorId: string): void {
  updateDatabase((db) =>
    withAudit(
      {
        ...db,
        payouts: db.payouts.map((p) =>
          p.id === id ? { ...p, status: "failed", paidAt: null, failureReason: reason } : p,
        ),
      },
      { actorId, action: "payout.failed", targetId: id, summary: reason },
    ),
  );
}

// ── Advisor application (the consumer side of verification) ──────────────

export type AdvisorApplication = {
  readonly fullName: string;
  readonly phone: string;
  readonly birthDate: string;
  readonly nationalIdLast4: string;
  readonly field: string;
  readonly credential: string;
  readonly skills: ReadonlyArray<{ readonly skill: string; readonly documentName: string }>;
};

/** What stage 3's submit does: one identity request and a proof per skill. */
export function submitAdvisorApplication(accountId: string, application: AdvisorApplication): void {
  updateDatabase((db) => {
    const at = nowIso();
    const withRequest: Database = {
      ...db,
      identityRequests: [
        {
          id: newId("idv"),
          accountId,
          fullName: application.fullName,
          birthDate: application.birthDate,
          nationalIdLast4: application.nationalIdLast4,
          field: application.field,
          credential: application.credential,
          submittedAt: at,
          status: "submitted",
          decision: null,
        },
        ...db.identityRequests,
      ],
      skillProofs: [
        ...application.skills.map((entry) => ({
          id: newId("skp"),
          accountId,
          skill: entry.skill,
          documentName: entry.documentName,
          submittedAt: at,
          status: "pending" as const,
          decision: null,
        })),
        ...db.skillProofs,
      ],
    };
    return patchAccount(withRequest, accountId, (account) => ({
      phone: application.phone || account.phone,
      advisor: {
        field: application.field,
        credential: application.credential,
        identity: "submitted",
        level: account.advisor?.level ?? 1,
        rating: account.advisor?.rating ?? 0,
        catalogueId: account.advisor?.catalogueId ?? null,
      },
    }));
  });
}
