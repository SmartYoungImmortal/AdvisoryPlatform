import type { Weekday } from "@/lib/availability/profiles";

/**
 * Figma "Create service" / "Edit service" (1594:29589, 30215, 30293, 29680, 29786) —
 * one form at two modes and a few states.
 *
 * `create` starts empty and publishes; `edit` starts filled and saves, and is the
 * only mode with the hide/delete zone. The create states are the ones the frames
 * draw: an Advisor with no Availability Profile yet (nothing to publish against),
 * and one who has switched the per-service daily ceiling on.
 */

export type ServiceFormMode = "create" | "edit";
export type ServiceFormState = "default" | "no-profile" | "limit-on" | "delete";

/** Categories the select offers. `edit` opens on `finance`. */
export const SERVICE_CATEGORIES = [
  { value: "finance", label: "การเงิน" },
  { value: "business", label: "ธุรกิจและการตลาด" },
  { value: "career", label: "อาชีพและการทำงาน" },
] as const;

export const PROFILE_OPTIONS = [
  { value: "general", label: "งานให้คำปรึกษาทั่วไป" },
  { value: "career-coaching", label: "Career coaching" },
] as const;

/** What the edit frame shows in its fields. */
export const EDIT_VALUES = {
  name: "วางแผนภาษีสำหรับฟรีแลนซ์",
  description:
    "เหมาะกับฟรีแลนซ์และผู้มีรายได้หลายทาง ไล่ดูรายรับทีละก้อน หาค่าลดหย่อนที่ใช้ได้จริง แล้ววางแผนภาษีปีถัดไป",
  price: "600",
  maxSlots: "4",
  category: "finance",
  profile: "general",
  trialProfile: "general",
  screeningQuestionCount: 3,
} as const;

/** The placeholders the create frame shows instead. */
export const CREATE_PLACEHOLDERS = { price: "600", maxSlots: "4" } as const;

/** The week the selected profile previews under its select. */
export const PREVIEW_WEEK: Partial<Record<Weekday, string>> = {
  mon: "09:00–12:00, 14:00–16:00",
  wed: "13:00–17:00",
};

export const PREVIEW_TIMEZONE = "Asia/Bangkok";

/** The most images one service may carry. */
export const MAX_SERVICE_IMAGES = 6;

/**
 * Figma "Service limit on" — the per-service ceiling sits under the Advisor's global
 * one and cannot exceed it; the note under the stepper states both.
 */
export const SERVICE_LIMIT = { hours: 2, globalHours: 3 } as const;
