/**
 * REFUND_CASES (OPEN/APPROVED/REJECTED) — queue copy from the wireframe
 * (1042:15191): reason + service, detail body, three evidence attachments.
 */
export type RefundCase = {
  readonly id: string;
  readonly reason: string;
  readonly detail: string;
  readonly service: string;
  readonly requester: string;
  readonly amountSatang: number;
  readonly evidenceCount: number;
  readonly status: "OPEN" | "APPROVED" | "REJECTED";
};

export const refundCases: ReadonlyArray<RefundCase> = [
  {
    id: "rfc-2026-0813-001",
    reason: "ไม่ได้รับบริการจากผู้ให้คำปรึกษา",
    detail: "ผู้ให้บริการไม่เข้า Video Call ตามที่ตกลงไว้",
    service: "Minecraft Tutorial",
    requester: "John BuyerOnly",
    amountSatang: 120000,
    evidenceCount: 3,
    status: "OPEN",
  },
  {
    id: "rfc-2026-0813-002",
    reason: "ไม่ได้รับบริการจากผู้ให้คำปรึกษา",
    detail: "นัดแล้วผู้ให้บริการยกเลิกกะทันหัน ไม่เสนอเวลาใหม่",
    service: "Minecraft Tutorial",
    requester: "Sarah Jenskins",
    amountSatang: 90000,
    evidenceCount: 2,
    status: "OPEN",
  },
  {
    id: "rfc-2026-0814-003",
    reason: "ไม่ได้รับบริการจากผู้ให้คำปรึกษา",
    detail: "เซสชันจบก่อนเวลา 40 นาทีโดยไม่มีการชดเชย",
    service: "Minecraft Tutorial",
    requester: "John BuyerOnly",
    amountSatang: 60000,
    evidenceCount: 3,
    status: "OPEN",
  },
] as const;
