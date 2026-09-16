/**
 * USERS fixtures — statuses from the ER (`ACTIVE | SUSPENDED`), names from the
 * wireframe (1042:15078). `fullName` is the admin-only legal name; ids double
 * as `generateStaticParams` input for /admin/users/[id].
 */
export type AdminUser = {
  readonly id: string;
  readonly fullName: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: "user" | "advisor";
  readonly status: "ACTIVE" | "SUSPENDED";
  readonly joinedAt: string;
  readonly suspension?: {
    readonly reason: string;
    readonly until: string;
  };
};

export const adminUsers: ReadonlyArray<AdminUser> = [
  {
    id: "john-minecraft",
    fullName: "จอห์น ไมน์คราฟต์",
    displayName: "John Minecraft",
    email: "john.minecraft@example.com",
    role: "advisor",
    status: "ACTIVE",
    joinedAt: "2026-03-14",
  },
  {
    id: "john-buyeronly",
    fullName: "จอห์น บายเออร์",
    displayName: "John BuyerOnly",
    email: "john.buyer@example.com",
    role: "user",
    status: "ACTIVE",
    joinedAt: "2026-05-02",
  },
  {
    id: "sarah-jenskins",
    fullName: "ซาร่า เจนสกินส์",
    displayName: "Sarah Jenskins",
    email: "s.jenskins@example.com",
    role: "advisor",
    status: "ACTIVE",
    joinedAt: "2026-01-27",
  },
  {
    id: "christopher-line",
    fullName: "คริสโตเฟอร์ สาย",
    displayName: "Christopher",
    email: "chris.line@example.com",
    role: "advisor",
    status: "SUSPENDED",
    joinedAt: "2026-02-09",
    suspension: {
      reason: "ชักชวนผู้ใช้ไปทำธุรกรรมนอกแพลตฟอร์ม (CF-08)",
      until: "2026-09-09",
    },
  },
] as const;
