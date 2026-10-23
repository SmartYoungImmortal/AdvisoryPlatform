/**
 * The shape of the in-browser database the prototype runs on until the Nest API
 * is deployed.
 *
 * Field names follow the API's ER (`docs/api-spec.md` in AdvisoryPlatformAPI)
 * closely enough that swapping this layer for fetch calls touches the store, not
 * the screens: money is integer satang, timestamps are ISO strings, every record
 * carries `createdAt`/`updatedAt`, and a review decision records who made it.
 */

export type Role = "advisee" | "advisor" | "admin";

/** `locked` is what five wrong passwords in a row do; an admin clears it. */
export type AccountStatus = "active" | "suspended" | "locked";

/** Keys into `lib/mock-db/avatars` — an image cannot be stored as JSON. */
export type AvatarKey = "araya" | "sarah" | "christopher" | "james" | "advisor";

export type IdentityStatus = "none" | "submitted" | "verified" | "rejected";

export type AdvisorLevel = 1 | 2 | 3;

/**
 * Figma "กำหนดระดับผู้ให้คำปรึกษา" (1952:36339) — the admin picks one of these when
 * approving an advisor, and the level pill prints it.
 */
export const advisorLevelTitles: Record<AdvisorLevel, string> = {
  1: "ผู้ให้คำปรึกษา",
  2: "ผู้เชี่ยวชาญ",
  3: "ผู้เชี่ยวชาญอาวุโส",
};

export type AdvisorProfile = {
  readonly field: string;
  readonly credential: string;
  readonly identity: IdentityStatus;
  readonly level: AdvisorLevel;
  /** One decimal, as the catalogue prints it. */
  readonly rating: number;
  /** The `lib/catalogue` advisor this account is, when it has public pages. */
  readonly catalogueId: string | null;
};

export type Suspension = {
  readonly reason: string;
  /** `null` is indefinite. */
  readonly until: string | null;
  readonly at: string;
  readonly by: string;
};

export type Account = {
  readonly id: string;
  /** What other users see. */
  readonly name: string;
  /** The legal name from identity verification — admin eyes only. */
  readonly fullName: string;
  readonly email: string;
  /**
   * Plain text on purpose: this is a fixture living in the viewer's own browser,
   * and the demo accounts print theirs on the login screen. Nothing here is ever
   * sent anywhere.
   */
  readonly password: string;
  readonly phone: string;
  readonly role: Role;
  readonly status: AccountStatus;
  readonly avatar: AvatarKey | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastLoginAt: string | null;
  readonly failedLogins: number;
  readonly suspension: Suspension | null;
  readonly advisor: AdvisorProfile | null;
  readonly stats: {
    readonly sessions: number;
    readonly bookings: number;
    readonly reviews: number;
  };
};

export type Decision = {
  readonly at: string;
  readonly by: string;
  readonly note: string | null;
};

export type IdentityRequest = {
  readonly id: string;
  readonly accountId: string;
  readonly fullName: string;
  readonly birthDate: string;
  /** Masked the way the admin sees it — the last four digits only. */
  readonly nationalIdLast4: string;
  readonly field: string;
  readonly credential: string;
  readonly submittedAt: string;
  readonly status: "submitted" | "verified" | "rejected";
  readonly decision: Decision | null;
};

export type SkillProof = {
  readonly id: string;
  readonly accountId: string;
  readonly skill: string;
  readonly documentName: string;
  readonly submittedAt: string;
  readonly status: "pending" | "approved" | "rejected";
  readonly decision: Decision | null;
};

export type PublishStatus = "published" | "hidden";

export type MarketService = {
  readonly id: string;
  readonly title: string;
  readonly advisorId: string;
  readonly categoryId: string;
  readonly priceSatang: number;
  readonly minutes: number;
  readonly bookings: number;
  readonly rating: number;
  readonly status: PublishStatus;
  /** Why an admin took it down, shown to the advisor. */
  readonly hiddenReason: string | null;
  /** The `lib/catalogue` service this is, when it has a public page. */
  readonly catalogueId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type Category = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: PublishStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type Skill = {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type RefundStatus = "pending" | "approved" | "rejected";

export type RefundRequest = {
  readonly id: string;
  readonly bookingRef: string;
  readonly requesterId: string;
  readonly advisorId: string;
  readonly serviceTitle: string;
  readonly sessionAt: string;
  readonly paidSatang: number;
  readonly reason: string;
  readonly detail: string;
  readonly evidenceCount: number;
  readonly requestedAt: string;
  readonly status: RefundStatus;
  /** What was actually returned — a partial refund is less than `paidSatang`. */
  readonly refundedSatang: number | null;
  readonly decision: Decision | null;
};

/**
 * The reasons a conversation can be reported for. Same list, same order as the
 * reporter-facing form (Figma 1456:19360).
 */
export const reportCategories = [
  "off-platform",
  "scam",
  "harassment",
  "spam",
  "misrepresentation",
  "other",
] as const;

export type ReportCategory = (typeof reportCategories)[number];

export type ReportStatus = "open" | "dismissed" | "warned" | "suspended";

export type UserReport = {
  readonly id: string;
  readonly category: ReportCategory;
  readonly reporterId: string;
  readonly reportedId: string;
  readonly detail: string;
  /** The lines of the conversation the reporter attached. */
  readonly excerpt: readonly string[];
  readonly createdAt: string;
  readonly status: ReportStatus;
  readonly decision: Decision | null;
};

/** What the chat scanner looks for — CF-08 in the requirements. */
export const offPlatformSignals = ["phone", "line", "bank", "link", "email"] as const;

export type OffPlatformSignal = (typeof offPlatformSignals)[number];

export type RiskLevel = "low" | "medium" | "high";

export type OffPlatformFlag = {
  readonly id: string;
  readonly conversationId: string;
  readonly senderId: string;
  readonly recipientId: string;
  readonly message: string;
  /** The substrings that tripped the scanner, highlighted in review. */
  readonly matches: ReadonlyArray<{
    readonly signal: OffPlatformSignal;
    readonly text: string;
  }>;
  readonly risk: RiskLevel;
  readonly detectedAt: string;
  readonly status: ReportStatus;
  readonly decision: Decision | null;
};

export type PayoutStatus = "pending" | "paid" | "failed";

export type Payout = {
  readonly id: string;
  readonly advisorId: string;
  readonly bank: string;
  readonly accountLast4: string;
  readonly amountSatang: number;
  readonly invoiceCount: number;
  readonly requestedAt: string;
  readonly status: PayoutStatus;
  readonly paidAt: string | null;
  readonly failureReason: string | null;
};

export type TransactionStatus = "paid" | "refunded" | "failed";

export type Transaction = {
  readonly id: string;
  readonly bookingRef: string;
  readonly payerId: string;
  readonly advisorId: string;
  readonly serviceTitle: string;
  readonly amountSatang: number;
  /** The platform's 5% of `amountSatang`. */
  readonly feeSatang: number;
  readonly method: "card" | "promptpay";
  readonly status: TransactionStatus;
  readonly createdAt: string;
};

export type AuditEntry = {
  readonly id: string;
  readonly at: string;
  readonly actorId: string;
  readonly action: string;
  readonly targetId: string;
  readonly summary: string;
};

export type Database = {
  readonly version: number;
  readonly accounts: readonly Account[];
  readonly identityRequests: readonly IdentityRequest[];
  readonly skillProofs: readonly SkillProof[];
  readonly services: readonly MarketService[];
  readonly categories: readonly Category[];
  readonly skills: readonly Skill[];
  readonly refunds: readonly RefundRequest[];
  readonly reports: readonly UserReport[];
  readonly offPlatformFlags: readonly OffPlatformFlag[];
  readonly payouts: readonly Payout[];
  readonly transactions: readonly Transaction[];
  readonly audit: readonly AuditEntry[];
};
