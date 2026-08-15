#!/usr/bin/env node
/**
 * Guards the design system against the drift that comes from transcribing Figma
 * frames literally: arbitrary Tailwind values that already have a token, raw hex
 * colours that never theme, and bare HTML controls that skip the shadcn/ui
 * primitives (and with them the focus ring, aria-invalid wiring and keyboard
 * behaviour).
 *
 * `components/ui/**` is exempt — it is vendored by `shadcn add` and gets
 * overwritten wholesale, so it is not ours to police.
 *
 * Run: node scripts/check-design-tokens.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SPACING_PREFIXES =
  "p|px|py|pt|pb|pl|pr|m|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|size|h|w|min-h|min-w";

/** px values that map exactly onto the configured `--radius` scale. */
const RADIUS_ON_SCALE = { 6: "sm", 8: "md", 10: "lg", 14: "xl", 18: "2xl", 22: "3xl", 26: "4xl" };

const RULES = [
  {
    id: "arbitrary-font-size",
    re: /\btext-\[[\d.]+(px|rem)\]/g,
    message: "use the type scale (text-xs/sm/base/xl/2xl/heading) — see @theme in app/globals.css",
  },
  {
    id: "arbitrary-line-height",
    re: /\bleading-\[[\d.]+px\]/g,
    message:
      "line-height rides on the font-size step; if the design really needs a different one, use the leading-* scale",
  },
  {
    id: "arbitrary-radius",
    re: /\brounded(-[tblr][lr])?-\[(\d+)px\]/g,
    test: (m) => RADIUS_ON_SCALE[m[2]],
    message: (m) => `use rounded${m[1] ?? ""}-${RADIUS_ON_SCALE[m[2]]} — ${m[2]}px is on the --radius scale`,
  },
  {
    id: "arbitrary-spacing",
    re: new RegExp(String.raw`\b(${SPACING_PREFIXES})-\[(\d+)px\]`, "g"),
    // Even values up to 64px land on the 4px grid; larger or odd ones are
    // genuine one-off Figma dimensions and stay arbitrary.
    test: (m) => Number(m[2]) > 0 && Number(m[2]) % 2 === 0 && Number(m[2]) <= 64,
    message: (m) => `use ${m[1]}-${Number(m[2]) / 4} — ${m[2]}px is on the spacing scale`,
  },
  {
    id: "raw-hex-colour",
    re: /(?:bg|text|border|ring|fill|stroke|from|via|to|shadow)-\[#[0-9a-fA-F]{3,8}\]/g,
    message: "add a token in app/globals.css instead — raw hex does not follow the dark theme",
  },
  {
    id: "raw-palette-colour",
    re: /\b(?:bg|text|border|ring)-(?:slate|gray|zinc|neutral|stone)-\d{2,3}\b/g,
    message: "use a semantic token (bg-background/bg-muted/bg-card/text-muted-foreground …)",
  },
  {
    id: "raw-control",
    re: /<(input|textarea|select|dialog)\b/g,
    message: (m) =>
      `use the shadcn primitive instead of <${m[1]}> — it carries the focus ring, aria-invalid and disabled states`,
  },
  {
    // A bare <button> is fine (it is what `render={<button />}` hands to a
    // primitive); a *styled* one means a button was rebuilt by hand.
    id: "hand-styled-button",
    re: /<button[^>]*\sclassName=/g,
    message: "use <Button> — a styled raw button re-implements the primitive without its states",
  },
  {
    id: "literal-bw-text",
    re: /\b(?:bg|text|border)-(?:white|black)\b/g,
    message: "pair it with the surface token (text-primary-foreground, text-destructive-foreground …)",
  },
  {
    id: "redundant-font-thai",
    re: /\bfont-thai\b/g,
    message: "Noto Sans Thai is --font-sans, so this is inherited; only `font-latin` needs opting in",
  },
];

/** `components/ui` is vendored by `shadcn add`; it is not ours to police. */
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

const files = [...collect("components"), ...collect("app")];

/**
 * Comments routinely name the class a line moved away from ("`bg-neutral-100`
 * here stayed light in dark mode"), and those explanations span several lines, so
 * matching a comment-looking *prefix* is not enough. Blank the comment bodies out
 * instead, padding with spaces so line and column numbers still line up.
 */
function maskComments(source) {
  const blank = (match) => match.replaceAll(/[^\n]/g, " ");
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, blank) // /* … */ and the body of {/* … */}
    .replaceAll(/(^|[^:])\/\/[^\n]*/g, (match, before) => before + blank(match.slice(before.length)));
}

const problems = [];

for (const file of files) {
  const lines = maskComments(readFileSync(file, "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        if (rule.test && !rule.test(m)) continue;
        problems.push({
          file,
          line: i + 1,
          match: m[0],
          message: typeof rule.message === "function" ? rule.message(m) : rule.message,
          id: rule.id,
        });
      }
    }
  });
}

if (problems.length === 0) {
  console.log(`design tokens: ${files.length} files clean`);
  process.exit(0);
}

for (const p of problems) {
  console.error(`${p.file}:${p.line}  ${p.match}\n    [${p.id}] ${p.message}`);
}
console.error(`\n${problems.length} design-token violation(s) in ${files.length} files`);
process.exit(1);
