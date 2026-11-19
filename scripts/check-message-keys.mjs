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
 * The namespaces a file can build keys under: opened (`useTranslations("chat")`),
 * typed (`useTranslations<"chat">`), read off the JSON itself (`th.home[…]`), or
 * none at all (`useTranslations()`, whole keys).
 */
function namespacesIn(text) {
  const namespaces = new Set(/(?:use|get)Translations\(\s*\)/.test(text) ? [""] : []);
  for (const match of text.matchAll(/(?:use|get)Translations(?:<[^>]*>)?\(\s*["'`]([^"'`]+)["'`]/g)) {
    namespaces.add(match[1]);
  }
  for (const match of text.matchAll(/(?:use|get)Translations<\s*["'`]([^"'`]+)["'`]\s*>/g)) namespaces.add(match[1]);
  for (const imported of text.matchAll(/import\s+(\w+)\s+from\s+["']@\/messages\/\w+\.json["']/g)) {
    for (const match of text.matchAll(new RegExp(String.raw`\b${imported[1]}\.(\w+)`, "g"))) namespaces.add(match[1]);
  }
  return namespaces;
}

/** Quoted strings, and an object's own keys: `t(ask)` where `ask` is a `keyof typeof ASK`. */
function addPlainStrings(text, plain) {
  for (const match of text.matchAll(/"([^"\\\n]*)"|'([^'\\\n]*)'/g)) plain.add(match[1] ?? match[2]);
  for (const line of text.split("\n")) {
    const key = /^([A-Za-z_]\w*)\??:/.exec(line.trimStart());
    if (key) plain.add(key[1]);
  }
}

/** Template strings: a plain one is a string; one with `${…}` is a pattern for the keys it can build. */
function addTemplates(text, namespaces, plain, patterns) {
  for (const match of text.matchAll(/`([^`]*)`/g)) {
    const body = match[1];
    if (!body.includes("${")) {
      plain.add(body);
      continue;
    }
    // Each `${…}` may be any run of characters; the rest must match as written.
    const parts = body.split(/\$\{[^}]*\}/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`));
    // A bare `${value}` builds no key of its own; one with words or a dot (`${kind}.${state}`) may.
    if (/[A-Za-z]{2}|\./.test(parts.join(""))) patterns.push({ re: new RegExp(`^${parts.join(".+")}$`), namespaces });
  }
}

/**
 * The plain strings in the sources, and each template string as a pattern for
 * the keys it can build — under the namespaces its own file opens, since a
 * template like `${field}Hint` names only its file's keys.
 */
function stringsInSources() {
  const plain = new Set();
  const patterns = [];
  for (const file of SOURCE_DIRS.flatMap((dir) => sources(dir))) {
    const text = readFileSync(file, "utf8");
    addPlainStrings(text, plain);
    addTemplates(text, namespacesIn(text), plain, patterns);
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

const keysByLocale = new Map(LOCALES.map((locale) => [locale, load(locale)]));
const problems = [];
for (const locale of LOCALES) {
  const keys = keysByLocale.get(locale);
  const others = LOCALES.filter((other) => other !== locale).map((other) => keysByLocale.get(other));
  const only = [...keys].filter((key) => others.some((other) => !other.has(key)));
  if (only.length > 0) problems.push(`${only.length} key(s) only in messages/${locale}.json:\n  ${only.join("\n  ")}`);
}

if (process.argv.includes("--unused")) {
  const found = stringsInSources();
  const all = new Set([...keysByLocale.values()].flatMap((keys) => [...keys]));
  const unused = [...all].filter((key) => !isUsed(key, found)).sort((a, b) => a.localeCompare(b));
  if (unused.length > 0) problems.push(`${unused.length} key(s) no source file uses:\n  ${unused.join("\n  ")}`);
}

if (problems.length > 0) {
  console.error(`message keys:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("message keys: th and en in step");
