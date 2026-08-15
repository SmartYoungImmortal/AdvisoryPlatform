/** SERVICES fixtures — names/owners from the wireframe table (1042:15113). */
export type AdminService = {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly category: string;
  readonly isPublished: boolean;
};

export const adminServices: ReadonlyArray<AdminService> = [
  {
    id: "svc-minecraft-tutorial",
    name: "Minecraft Tutorial",
    owner: "John Minecraft",
    category: "ติวเตอร์เกม",
    isPublished: true,
  },
  {
    id: "svc-research-consult",
    name: "ปรึกษาระเบียบวิธีวิจัย",
    owner: "Sarah Jenskins",
    category: "วิชาการ",
    isPublished: true,
  },
  {
    id: "svc-thesis-stats",
    name: "วิเคราะห์สถิติวิทยานิพนธ์",
    owner: "Sarah Jenskins",
    category: "วิชาการ",
    isPublished: false,
  },
] as const;
