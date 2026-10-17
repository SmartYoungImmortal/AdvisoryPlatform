import { describe, expect, it } from "vitest";
import {
  CREATE_PLACEHOLDERS,
  EDIT_VALUES,
  MAX_SERVICE_IMAGES,
  PREVIEW_TIMEZONE,
  PREVIEW_WEEK,
  SERVICE_CATEGORIES,
  SERVICE_LIMIT,
  type ServiceFormMode,
  type ServiceFormState,
} from "@/lib/advisor-services/form";

describe("service form configuration", () => {
  it("defines the create and edit selectors and defaults used by the service flow", () => {
    const modes: ServiceFormMode[] = ["create", "edit"];
    const states: ServiceFormState[] = ["default", "no-profile", "limit-on", "delete"];
    expect(modes).toHaveLength(2);
    expect(states).toContain("no-profile");
    expect(SERVICE_CATEGORIES.map((category) => category.value)).toEqual(["finance", "business", "career"]);
    expect(EDIT_VALUES.category).toBe("finance");
    expect(EDIT_VALUES.profile).toBe("general");
    expect(Number(EDIT_VALUES.price)).toBeGreaterThan(0);
    expect(CREATE_PLACEHOLDERS.price).toBeTruthy();
    expect(CREATE_PLACEHOLDERS.maxSlots).toBeTruthy();
    expect(MAX_SERVICE_IMAGES).toBe(6);
    expect(PREVIEW_TIMEZONE).toBe("Asia/Bangkok");
    expect(Object.keys(PREVIEW_WEEK)).toEqual(["mon", "wed"]);
    expect(SERVICE_LIMIT.hours).toBeLessThan(SERVICE_LIMIT.globalHours);
  });
});
