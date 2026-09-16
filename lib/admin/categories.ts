/**
 * SERVICE_CATEGORIES + SKILLS master lists (ER tables nobody user-facing
 * populates) — edited on /admin/manage (Figma 1042:15172 TH / 1042:15251 EN).
 */
export const serviceCategories: ReadonlyArray<string> = [
  "วิชาการ",
  "ติวเตอร์เกม",
  "อาชีพและการทำงาน",
  "การเงินส่วนบุคคล",
] as const;

export const skillsTaxonomy: ReadonlyArray<string> = [
  "ระเบียบวิธีวิจัย",
  "สถิติสำหรับงานวิจัย",
  "การเขียนบทความวิชาการ",
  "Minecraft Redstone",
] as const;
