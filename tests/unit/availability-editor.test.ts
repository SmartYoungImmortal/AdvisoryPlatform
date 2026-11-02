import { describe, expect, it } from "vitest";
import {
  BLOCKED_DATES,
  EDITED_PROFILE_NAME,
  endTimeOptions,
  PRESET_WEEKLY_DAYS,
  SPECIFIC_DATES,
  WEEKLY_DAYS,
  WEEKLY_ERROR,
  WEEK_PRESETS,
} from "@/lib/availability/editor";

describe("availability editor data", () => {
  it("provides weekly schedule and the overlapping backwards-range example", () => {
    expect(WEEKLY_DAYS.map((day) => day.day)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    expect(WEEKLY_DAYS.find((day) => day.day === "mon")?.ranges).toHaveLength(2);
    expect(WEEKLY_DAYS.find((day) => day.day === "wed")?.ranges[0]).toEqual({ start: "13:00", end: "17:00" });
    expect(WEEKLY_DAYS.filter((day) => day.ranges.length === 0)).toHaveLength(5);
    expect(WEEKLY_ERROR.ranges[1].start).toBe("11:00");
    expect(WEEKLY_ERROR.ranges[1].end).toBe("10:00");
  });

  it("provides specific, blocked and preset availability states", () => {
    expect(EDITED_PROFILE_NAME).toBeTruthy();
    expect(SPECIFIC_DATES).toHaveLength(2);
    expect(SPECIFIC_DATES[1].ranges).toHaveLength(2);
    expect(BLOCKED_DATES[0].range).toBeUndefined();
    expect(BLOCKED_DATES[1].range).toEqual({ start: "12:00", end: "14:00" });
    expect(WEEK_PRESETS.map((preset) => preset.id)).toEqual(["weekdays", "everyday", "weekend", "custom"]);
    expect(PRESET_WEEKLY_DAYS).toHaveLength(7);
    expect(PRESET_WEEKLY_DAYS.slice(0, 5).every((day) => day.ranges.length === 1)).toBe(true);
    expect(PRESET_WEEKLY_DAYS.slice(5).every((day) => day.ranges.length === 0)).toBe(true);
  });

  it("offers later times with durations from the actual start without crossing midnight", () => {
    expect(endTimeOptions("14:00")).toContainEqual({ time: "15:30", minutes: 90 });
    expect(endTimeOptions("23:00")).toEqual([{ time: "23:30", minutes: 30 }]);
    expect(endTimeOptions("23:45")).toEqual([]);
    expect(endTimeOptions("")).toEqual([]);
    expect(endTimeOptions("24:00")).toEqual([]);
  });
});
