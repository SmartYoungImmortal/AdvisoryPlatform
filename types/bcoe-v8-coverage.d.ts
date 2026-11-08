declare module "@bcoe/v8-coverage" {
  import type { Profiler } from "node:inspector";

  // Version 1.0.2 ships JavaScript only; its documented input/output use the
  // inspector's unmodified ProcessCoverage shape.
  export function mergeProcessCovs(
    coverages: { result: Profiler.ScriptCoverage[] }[],
  ): { result: Profiler.ScriptCoverage[] };
}
