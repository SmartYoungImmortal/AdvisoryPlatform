import { describe, expect, it } from "vitest";
import { mapInBatches } from "../../scripts/coverage-batch.mjs";

describe("coverage work batching", () => {
  it("bounds concurrent work and preserves the requested order", async () => {
    let active = 0;
    let peak = 0;
    const result = await mapInBatches(
      [3, 1, 2, 0, 4],
      async (value) => {
        active++;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active--;
        return value * 2;
      },
      2,
    );
    expect(result).toEqual([6, 2, 4, 0, 8]);
    expect(peak).toBe(2);
    expect(active).toBe(0);
  });

  it("does not start later work after a batch fails", async () => {
    const started: number[] = [];
    await expect(
      mapInBatches(
        [1, 2, 3, 4],
        async (value) => {
          started.push(value);
          if (value === 2) throw new Error("source map unavailable");
          return value;
        },
        2,
      ),
    ).rejects.toThrow("source map unavailable");
    expect(started).toEqual([1, 2]);
  });
});
