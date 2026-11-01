import { mapInBatches } from "../../../scripts/coverage-batch.mjs";
import { createHash } from "node:crypto";
import { mergeProcessCovs } from "@bcoe/v8-coverage";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { test as base, type Page } from "@playwright/test";
import {
  projectSource,
  warmBrowserSources,
} from "../../../scripts/warm-ui-coverage.mjs";

export { expect } from "@playwright/test";
export type {
  Page,
  Route,
  APIRequestContext,
  Browser,
  BrowserContext,
} from "@playwright/test";

export const test = base.extend<{ uiCoverage: void }>({
  uiCoverage: [
    async ({ page }, run, testInfo) => {
      const directory = process.env.UI_COVERAGE_DIR;
      if (!directory) {
        await run();
        return;
      }
      await warmBrowserSources(directory);
      const captured: (Awaited<
        ReturnType<Page["coverage"]["stopJSCoverage"]>
      >[number] & { source: string; sourceMap: unknown })[] = [];
      async function snapshot(restart: boolean) {
        const scripts = await page.coverage.stopJSCoverage();
        const reads = await mapInBatches(scripts, async (script) => {
          if (
            !script.url.startsWith(
              "http://localhost:3001/_next/static/chunks/",
            ) ||
            !script.source
          )
            return null;
          if (!/"\[project\]\/(components|lib)\//.test(script.source))
            return null;
          const mapping = script.source.match(
            /\/\/# sourceMappingURL=(\S+)/,
          )?.[1];
          if (!mapping) return null;
          const response = await page.request.get(
            new URL(mapping, script.url).href,
          );
          if (!response.ok())
            throw new Error(
              `Coverage source map unavailable: ${response.status()} ${new URL(mapping, script.url).href}`,
            );
          const sourceMap: unknown = await response.json();
          if (!projectSource(sourceMap)) return null;
          return { ...script, source: script.source, sourceMap };
        });
        captured.push(...reads.filter((item) => item !== null));
        if (restart)
          await page.coverage.startJSCoverage({ resetOnNavigation: false });
      }
      const goto = page.goto.bind(page);
      const reload = page.reload.bind(page);
      // Flush before explicit document changes; Chromium may discard old counts.
      page.goto = async (...args) => {
        await snapshot(true);
        return goto(...args);
      };
      page.reload = async (...args) => {
        await snapshot(true);
        return reload(...args);
      };
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      try {
        await run();
      } finally {
        page.goto = goto;
        page.reload = reload;
        await snapshot(false);
      }
      const byCode = new Map<string, (typeof captured)[number]>();
      const processes = captured.map((script) => {
        const hash = createHash("sha256").update(script.source).digest("hex");
        byCode.set(hash, script);
        return {
          result: [{ url: hash, scriptId: hash, functions: script.functions }],
        };
      });
      const compact = mergeProcessCovs(processes).result.map((script) => {
        const original = byCode.get(script.url);
        if (!original)
          throw new Error("Captured source missing during coverage merge");
        return { ...original, functions: script.functions };
      });
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(directory, `${testInfo.testId}-${testInfo.retry}.json`),
        JSON.stringify(compact),
      );
    },
    { auto: true, timeout: 120_000 },
  ],
});
