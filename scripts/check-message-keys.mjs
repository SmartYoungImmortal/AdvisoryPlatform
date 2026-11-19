#!/usr/bin/env node
/**
 * Keeps the two message files in step.
 *
 * English is laid over Thai (`lib/i18n/locale-provider.tsx`), so a key that
 * exists only in `messages/th.json` shows its Thai in English mode. This fails
 * on any key that exists in one language only.
 *
 * With `--unused` it also lists the keys no source file uses, and fails on
 * them. A key counts as used when a source file names it — as a string, whole
 * (`"chat.title"`) or split between a namespace and the rest
 * (`useTranslations("chat")` and `t("title")` in any files), or as an object's
 * own key (`t(ask)` over `keyof typeof ASK`) — or when a template string can
 * build it (`status.${state}` uses every `status.*`).
 * Kept on the generous side: a key it calls used may not be, never the other
 * way round, so removing what it lists breaks nothing.
 *
 * Run: node scripts/check-message-keys.mjs [--unused]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["th", "en"];
const SOURCE_DIRS = ["app", "components", "lib"];
const SKIP = new Set(["node_modules", ".next", ".git", ".wrangler", "out"]);

/** Every leaf key as a dotted path. */
function leafKeys(tree, prefix = "", found = []) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") leafKeys(value, path, found);
    else found.push(path);
  }
  return found;
}

function load(locale) {
  return new Set(leafKeys(JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))));
}

function sources(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (SKIP.has(entry.name)) continue;
    if (entry.isDirectory()) sources(path, found);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}

/**
 * The plain strings in the sources, and each template string as a pattern for
 * the keys it can build — under the namespaces its own file opens (or as a
 * whole key), since a template like `${field}Hint` names only its file's keys.
 */
function stringsInSources() {
  const plain = new Set();
  const patterns = [];
  for (const file of SOURCE_DIRS.flatMap((dir) => sources(dir))) {
    const text = readFileSync(file, "utf8");
    // A file that opens no namespace (`useTranslations()`) builds whole keys.
    const namespaces = new Set(/(?:useTranslations|getTranslations)\(\s*\)/.test(text) ? [""] : []);
    // Opened (`useTranslations("chat")`), typed (`useTranslations<"chat">`), or read off the file itself (`th.home[…]`).
    for (const match of text.matchAll(/(?:useTranslations|getTranslations)(?:<\s*["'`]([^"'`]+)["'`]\s*>|(?:<[^>]*>)?\(\s*["'`]([^"'`]+)["'`])/g)) {
      namespaces.add(match[1] ?? match[2]);
    }
    for (const imported of text.matchAll(/import\s+(\w+)\s+from\s+["']@\/messages\/\w+\.json["']/g)) {
      for (const match of text.matchAll(new RegExp(`\\b${imported[1]}\\.(\\w+)`, "g"))) namespaces.add(match[1]);
    }
    for (const match of text.matchAll(/"([^"\\\n]*)"|'([^'\\\n]*)'/g)) plain.add(match[1] ?? match[2]);
    // An object's own keys name messages too: `t(ask)` where `ask` is a `keyof typeof ASK`.
    for (const match of text.matchAll(/^\s*([A-Za-z_]\w*)\??\s*:/gm)) plain.add(match[1]);
    for (const match of text.matchAll(/`([^`]*)`/g)) {
      const body = match[1];
      if (!body.includes("${")) {
        plain.add(body);
        continue;
      }
      // Each `${…}` may be any run of characters; the rest must match as written.
      const parts = body.split(/\$\{[^}]*\}/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      // A bare `${value}` builds no key of its own; one with words or a dot (`${kind}.${state}`) may.
      if (/[A-Za-z]{2}|\./.test(parts.join(""))) patterns.push({ re: new RegExp(`^${parts.join(".+")}$`), namespaces });
    }
  }
  return { plain, patterns };
}

function isUsed(key, { plain, patterns }) {
  const segments = key.split(".");
  for (let split = 0; split < segments.length; split += 1) {
    const namespace = segments.slice(0, split).join(".");
    const rest = segments.slice(split).join(".");
    if (patterns.some((pattern) => pattern.namespaces.has(namespace) && pattern.re.test(rest))) return true;
    if (split > 0 && !plain.has(namespace)) continue;
    if (plain.has(rest)) return true;
  }
  return false;
}

const [th, en] = LOCALES.map(load);
const problems = [];
for (const [locale, keys, other] of [
  ["th", th, en],
  ["en", en, th],
]) {
  const only = [...keys].filter((key) => !other.has(key));
  if (only.length > 0) problems.push(`${only.length} key(s) only in messages/${locale}.json:\n  ${only.join("\n  ")}`);
}

if (process.argv.includes("--unused")) {
  const found = stringsInSources();
  const unused = [...new Set([...th, ...en])].filter((key) => !isUsed(key, found)).sort();
  if (unused.length > 0) problems.push(`${unused.length} key(s) no source file uses:\n  ${unused.join("\n  ")}`);
}

if (problems.length > 0) {
  console.error(`message keys:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("message keys: th and en in step");
