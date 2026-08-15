#!/usr/bin/env node
/**
 * `<Button render={<Link/>}>` needs `nativeButton={false}`.
 *
 * Base UI's Button defaults the prop to true, so when `render` puts it on an
 * anchor the primitive keeps assuming a native <button> and skips the keyboard
 * and ARIA handling a non-button needs — the exact thing `render` is used to
 * preserve. Base UI only says so at runtime, in a dev-server log nobody opens,
 * and it slipped past seven call sites across two people before anyone noticed.
 * ESLint has no rule for it and Sonar does not model the prop, so it is checked
 * here.
 *
 * `components/ui/**` is exempt — it is vendored by `shadcn add`.
 *
 * Run: node scripts/check-a11y-render.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["node_modules", ".next", ".git", ".wrangler", "out", "components/ui"]);

function collect(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (SKIP.has(path) || SKIP.has(entry.name)) continue;
    if (entry.isDirectory()) collect(path, found);
    else if (entry.name.endsWith(".tsx")) found.push(path);
  }
  return found;
}

const problems = [];

// The attributes of one element are contiguous, so each `render=` line is walked
// up to its `<Button` and down to the end of the opening tag, and the whole tag
// is checked for the prop.
for (const file of [...collect("components"), ...collect("app")]) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (!/render=\{[^}]*<Link/.test(line)) return;
    let start = i;
    while (start > 0 && !/<Button\b/.test(lines[start])) start -= 1;
    if (!/<Button\b/.test(lines[start])) return; // some other component's render prop
    let end = i;
    while (end < lines.length - 1 && !/^\s*\/?>/.test(lines[end])) end += 1;
    if (/nativeButton/.test(lines.slice(start, end + 1).join("\n"))) return;
    problems.push({ file, line: i + 1, match: line.trim().slice(0, 60) });
  });
}

if (problems.length === 0) {
  console.log("a11y render: no <Button render={<Link/>}> is missing nativeButton");
  process.exit(0);
}

for (const p of problems) {
  console.error(
    `${p.file}:${p.line}  ${p.match}\n` +
      "    [render-link-without-nativebutton] add nativeButton={false} — Base UI assumes a" +
      " native <button> and drops the anchor's keyboard/ARIA handling",
  );
}
console.error(`\n${problems.length} render-as-link violation(s)`);
process.exit(1);
