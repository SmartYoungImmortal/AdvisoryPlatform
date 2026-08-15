/**
 * USER_REPORTS + folded OFF_PLATFORM_FLAGS (CF-08) — wireframe cards read
 * "Off-platform (เสี่ยงต่ำ)" with a reported user and a chat-log excerpt
 * (1042:15219). Admin resolves: dismiss (restore ranking) or suspend.
 */
export type UserReport = {
  readonly id: string;
  readonly category: "off-platform" | "harassment" | "scam";
  readonly risk: "LOW" | "HIGH";
  readonly reportedUser: string;
  readonly reportedUserId: string;
  readonly chatLog: string;
  readonly evidenceCount: number;
  readonly status: "OPEN" | "ACTIONED" | "DISMISSED";
};

export const userReports: ReadonlyArray<UserReport> = [
  {
    id: "rpt-2026-0812-001",
    category: "off-platform",
    risk: "LOW",
    reportedUser: "John Minecraft",
    reportedUserId: "john-minecraft",
    chatLog: "ติดต่อผมทาง Line ID: john minecraft",
    evidenceCount: 3,
    status: "OPEN",
  },
  {
    id: "rpt-2026-0813-002",
    category: "off-platform",
    risk: "HIGH",
    reportedUser: "Christopher",
    reportedUserId: "christopher-line",
    chatLog: "สวัสดีครับ อยากได้ทรูมันนี่ 300",
    evidenceCount: 3,
    status: "OPEN",
  },
  {
    id: "rpt-2026-0813-003",
    category: "off-platform",
    risk: "LOW",
    reportedUser: "John Minecraft",
    reportedUserId: "john-minecraft",
    chatLog: "โอนตรงถูกกว่านะ ไม่ต้องผ่านระบบ",
    evidenceCount: 2,
    status: "OPEN",
  },
  {
    id: "rpt-2026-0814-004",
    category: "off-platform",
    risk: "LOW",
    reportedUser: "John Minecraft",
    reportedUserId: "john-minecraft",
    chatLog: "แอดไลน์มาคุยต่อได้เลยครับ",
    evidenceCount: 1,
    status: "OPEN",
  },
] as const;
