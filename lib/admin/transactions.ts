/**
 * SERVICE_INVOICES ledger (PENDING→HELD_IN_ESCROW→RELEASED|REFUNDED|FAILED).
 * platformFeeSatang is the 5% cut the landing page advertises.
 */
export type AdminTransaction = {
  readonly id: string;
  readonly payer: string;
  readonly advisor: string;
  readonly service: string;
  readonly amountSatang: number;
  readonly platformFeeSatang: number;
  readonly status:
    | "PENDING"
    | "HELD_IN_ESCROW"
    | "RELEASED"
    | "REFUNDED"
    | "FAILED";
  readonly createdAt: string;
};

export const adminTransactions: ReadonlyArray<AdminTransaction> = [
  {
    id: "INV-2026-0814-091",
    payer: "John BuyerOnly",
    advisor: "John Minecraft",
    service: "Minecraft Tutorial",
    amountSatang: 120000,
    platformFeeSatang: 6000,
    status: "HELD_IN_ESCROW",
    createdAt: "2026-08-14",
  },
  {
    id: "INV-2026-0813-090",
    payer: "Sarah Jenskins",
    advisor: "John Minecraft",
    service: "Minecraft Tutorial",
    amountSatang: 90000,
    platformFeeSatang: 4500,
    status: "PENDING",
    createdAt: "2026-08-13",
  },
  {
    id: "INV-2026-0811-087",
    payer: "John BuyerOnly",
    advisor: "Sarah Jenskins",
    service: "ปรึกษาระเบียบวิธีวิจัย",
    amountSatang: 150000,
    platformFeeSatang: 7500,
    status: "RELEASED",
    createdAt: "2026-08-11",
  },
  {
    id: "INV-2026-0808-084",
    payer: "John BuyerOnly",
    advisor: "John Minecraft",
    service: "Minecraft Tutorial",
    amountSatang: 60000,
    platformFeeSatang: 3000,
    status: "REFUNDED",
    createdAt: "2026-08-08",
  },
  {
    id: "INV-2026-0807-083",
    payer: "Christopher",
    advisor: "Sarah Jenskins",
    service: "วิเคราะห์สถิติวิทยานิพนธ์",
    amountSatang: 180000,
    platformFeeSatang: 9000,
    status: "FAILED",
    createdAt: "2026-08-07",
  },
] as const;
