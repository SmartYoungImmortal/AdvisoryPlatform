import { describe, expect, it } from "vitest";
import { ADVISOR_LEVELS, asAdvisorLevel } from "@/components/advisor-public/level-badge";

describe("asAdvisorLevel", () => {
  it("keeps the three levels an admin can give", () => {
    expect(ADVISOR_LEVELS.map(asAdvisorLevel)).toEqual([1, 2, 3]);
  });

  it("reads a missing or unknown level as 1, the level every advisor starts at", () => {
    expect(asAdvisorLevel(undefined)).toBe(1);
    expect(asAdvisorLevel(null)).toBe(1);
    expect(asAdvisorLevel(0)).toBe(1);
    expect(asAdvisorLevel(4)).toBe(1);
  });
});
