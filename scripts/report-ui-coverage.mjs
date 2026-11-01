import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { mergeProcessCovs } from "@bcoe/v8-coverage";
import { AnyMap, encodedMap } from "@jridgewell/trace-mapping";
import { convert } from "ast-v8-to-istanbul";
import libCoverage from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import { parseAstAsync } from "vitest/node";
import { z } from "zod";
import {
  ownedSources,
  workloadUrl,
  sharedSourcesOutsideScope,
} from "./taj-owned-sources.mjs";

const root = process.cwd();
const rawDirectory = path.resolve(
  process.env.UI_COVERAGE_DIR ?? "ui-coverage/raw",
);
const outputDirectory = path.resolve(
  process.env.UI_COVERAGE_REPORT ?? "ui-coverage/report",
);
const range = z.object({
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
});
const capturedScript = z.object({
  url: z.url(),
  scriptId: z.string(),
  source: z.string(),
  sourceMap: z.unknown(),
  functions: z.array(
    z.object({
      functionName: z.string(),
      isBlockCoverage: z.boolean(),
      ranges: z.array(range).min(1),
    }),
  ),
});
const sources = await ownedSources(root);
const owned = new Set(sources);
const currentSource = new Map(
  await Promise.all(
    sources.map(async (file) => [file, await readFile(file, "utf8")]),
  ),
);
const sourceSha256 = createHash("sha256");
for (const file of sources)
  sourceSha256.update(
    `${path.relative(root, file)}\0${currentSource.get(file)}\0`,
  );
const coverage = libCoverage.createCoverageMap({});
const contentByUrl = new Map();
const processes = [];
const browserLoaded = new Set();
let scenarios = 0;
for (const name of (await readdir(rawDirectory)).filter((name) =>
  name.endsWith(".json"),
)) {
  const captured = z
    .array(capturedScript)
    .parse(JSON.parse(await readFile(path.join(rawDirectory, name), "utf8")));
  if (!captured.length) continue;
  if (name !== "warmup.json") scenarios++;
  const result = [];
  for (const script of captured) {
    const hash = createHash("sha256").update(script.source).digest("hex");
    const url = pathToFileURL(
      path.join(root, ".next", "ui-coverage", `${hash}.js`),
    ).href;
    contentByUrl.set(url, script);
    if (name !== "warmup.json") {
      for (const source of encodedMap(AnyMap(script.sourceMap)).sources) {
        if (source.startsWith("file:") && owned.has(fileURLToPath(source)))
          browserLoaded.add(fileURLToPath(source));
      }
    }
    result.push({ url, scriptId: hash, functions: script.functions });
  }
  processes.push({ result });
}
if (scenarios === 0 || contentByUrl.size === 0)
  throw new Error(
    "No browser coverage was captured; run UI_COVERAGE_DIR=<directory> with the browser tests first.",
  );
const merged = mergeProcessCovs(processes);
for (const script of merged.result) {
  const original = contentByUrl.get(script.url);
  if (!original) throw new Error(`Missing captured source: ${script.url}`);
  const sourceMap = encodedMap(AnyMap(original.sourceMap));
  for (const [index, name] of sourceMap.sources.entries()) {
    if (!name.startsWith("file:")) continue;
    const file = fileURLToPath(name);
    if (
      owned.has(file) &&
      sourceMap.sourcesContent?.[index] !== currentSource.get(file)
    ) {
      throw new Error(
        `Captured source differs from current ${path.relative(root, file)}. Clear captures and rerun; never merge different source revisions.`,
      );
    }
  }
  const mapped = await convert({
    code: original.source,
    ast: await parseAstAsync(original.source),
    sourceMap,
    coverage: script,
  });
  for (const [file, data] of Object.entries(mapped))
    if (owned.has(file)) coverage.addFileCoverage(data);
}

// Every owned file needs the same compiler output used by the browser. Warmup
// roots carry zero counts, so unvisited pages remain in a fixed denominator.
const missing = sources.filter((file) => !coverage.files().includes(file));
if (missing.length)
  throw new Error(
    `Owned files lack compiled source maps: ${missing.map((file) => path.relative(root, file)).join(", ")}. Add their real routes to warmup, or remove proven dead code; do not substitute another compiler.`,
  );
const unvisited = sources
  .filter((file) => !browserLoaded.has(file))
  .map((file) => path.relative(root, file));
await mkdir(outputDirectory, { recursive: true });
const context = libReport.createContext({
  dir: outputDirectory,
  coverageMap: coverage,
});
for (const name of ["html", "json", "json-summary", "text-summary"])
  reports.create(name).execute(context);
const summary = coverage.getCoverageSummary().toJSON();
await writeFile(
  path.join(outputDirectory, "scope.json"),
  JSON.stringify(
    {
      workloadUrl,
      sharedSourcesOutsideScope,
      sourceSha256: sourceSha256.digest("hex"),
      files: sources.map((file) => path.relative(root, file)),
      unvisited,
      capturedChunks: contentByUrl.size,
      scenarios,
      summary,
    },
    null,
    2,
  ),
);
console.log(
  `${sources.length} owned source files; ${scenarios} browser scenarios; ${unvisited.length} files never loaded. Report: ${path.relative(root, outputDirectory)}/index.html`,
);
if (process.argv.includes("--check")) {
  const below = ["statements", "branches", "functions", "lines"].filter(
    (metric) => summary[metric].pct < 80,
  );
  if (below.length) {
    console.error(
      `Owned-source coverage below 80%: ${below.join(", ")}. Keep #60 open.`,
    );
    process.exitCode = 1;
  }
}
