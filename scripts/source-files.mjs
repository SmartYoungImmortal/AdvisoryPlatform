/**
 * The .tsx files both guards police: everything under `components/` and `app/`
 * except `components/ui`, which is vendored by `shadcn add` and overwritten
 * wholesale, so it is not ours to police.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["node_modules", ".next", ".git", ".wrangler", "out", "components/ui"]);

function collect(dir, found) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (SKIP.has(path) || SKIP.has(entry.name)) continue;
    if (entry.isDirectory()) collect(path, found);
    else if (entry.name.endsWith(".tsx")) found.push(path);
  }
  return found;
}

export function sourceFiles() {
  return [...collect("components", []), ...collect("app", [])];
}
