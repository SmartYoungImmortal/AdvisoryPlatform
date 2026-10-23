import type { Localised } from "@/lib/legal/types";

/** The words around a legal document: breadcrumb, tabs, contents, summary. */
export const legalChrome: Localised<{
  readonly home: string;
  readonly terms: string;
  readonly privacy: string;
  readonly contents: string;
}> = {
  th: {
    home: "หน้าแรก",
    terms: "ข้อกำหนดการให้บริการ",
    privacy: "นโยบายความเป็นส่วนตัว",
    contents: "ในหน้านี้",
  },
  en: {
    home: "Home",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    contents: "On this page",
  },
};
