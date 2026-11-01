import { rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const directory = path.join(process.cwd(), "ui-coverage", "raw");
await rm(directory, { recursive: true, force: true });
const reportDirectory = path.join(process.cwd(), "ui-coverage", "report");
await rm(reportDirectory, { recursive: true, force: true });
const env = {
  ...process.env,
  UI_COVERAGE_DIR: directory,
  UI_COVERAGE_REPORT: reportDirectory,
};
const tests = spawnSync(
  "pnpm",
  ["exec", "playwright", "test", ...process.argv.slice(2)],
  { env, stdio: "inherit" },
);
const report = spawnSync(
  process.execPath,
  ["scripts/report-ui-coverage.mjs", "--check"],
  { env, stdio: "inherit" },
);
process.exitCode = tests.status === 0 && report.status === 0 ? 0 : 1;
