/**
 * PAYOUTS (PENDING/PAID/FAILED) — ER.README: transfer execution is manual in
 * Project 1. The FAILED row mirrors the advisor-side payout-history/failed
 * screen (บัญชีไม่ตรงกัน, S. JENSKINS, PO-2026-0730-0007) whose "ติดต่อ
 * ผู้ดูแล" CTA lands here.
 */
export type Payout = {
  readonly id: string;
  readonly advisor: string;
  readonly bankAccount: string;
  readonly amountSatang: number;
  readonly invoiceCount: number;
  readonly status: "PENDING" | "PAID" | "FAILED";
  readonly failureReason?: string;
};

export const payouts: ReadonlyArray<Payout> = [
  {
    id: "PO-2026-0812-0011",
    advisor: "John Minecraft",
    bankAccount: "กสิกรไทย ···4821",
    amountSatang: 456000,
    invoiceCount: 4,
    status: "PENDING",
  },
  {
    id: "PO-2026-0812-0012",
    advisor: "Sarah Jenskins",
    bankAccount: "ไทยพาณิชย์ ···9034",
    amountSatang: 228000,
    invoiceCount: 2,
    status: "PENDING",
  },
  {
    id: "PO-2026-0730-0007",
    advisor: "Sarah Jenskins",
    bankAccount: "ไทยพาณิชย์ ···9034",
    amountSatang: 114000,
    invoiceCount: 1,
    status: "FAILED",
    failureReason: "ชื่อบัญชีไม่ตรงกัน (ธนาคารแจ้ง: S. JENSKINS)",
  },
  {
    id: "PO-2026-0705-0003",
    advisor: "John Minecraft",
    bankAccount: "กสิกรไทย ···4821",
    amountSatang: 342000,
    invoiceCount: 3,
    status: "PAID",
  },
] as const;
