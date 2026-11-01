// @ts-check
import { access, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const mapShape = z.object({
  sources: z.array(z.string()).default([]),
  sections: z.array(z.object({ map: z.unknown() })).default([]),
});
/** @param {unknown} value
 * @returns {boolean} */
export function projectSource(value) {
  const map = mapShape.parse(value);
  return (
    map.sources.some(
      (source) =>
        source.startsWith("file:") && !source.includes("/node_modules/"),
    ) || map.sections.some((section) => projectSource(section.map))
  );
}
const routes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/reset-sent",
  "/verification-sent",
  "/email-verified",
  "/terms",
  "/privacy-policy",
  "/profile",
  "/profile/edit",
  "/settings",
  "/settings/password",
  "/settings/email",
  "/settings/email/verify",
  "/settings/logout",
  "/advisor/services",
  "/advisor/services/new",
  "/advisor/services/view",
  "/advisor/services/manage",
  "/advisor/services/manage/delete",
  "/advisor/services/tax-freelance",
  "/advisor/services/tax-freelance/schedule",
  "/availability",
  "/availability/profiles",
  "/availability/profiles/new",
  "/work/calendar",
  "/work/session",
  "/bookings",
  "/bookings/detail",
  "/bookings/refund",
  "/service/tax-freelance",
];
/** @param {string} url
 * @returns {Promise<Response>} */
async function response(url) {
  const result = await fetch(url);
  if (!result.ok)
    throw new Error(`Coverage warmup failed: ${result.status} ${url}`);
  return result;
}
/** Compile source maps without executing UI code or claiming a user flow.
 * @param {string} directory
 * @returns {Promise<void>} */
export async function warmBrowserSources(directory) {
  const destination = path.join(directory, "warmup.json");
  try {
    await access(destination);
    return;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
  }
  const origin = "http://localhost:3001";
  /** @type {Set<string>} */
  const chunks = new Set();
  for (const route of routes) {
    const html = await (await response(`${origin}${route}`)).text();
    for (const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
      const url = new URL(match[1], origin);
      if (
        url.origin === origin &&
        url.pathname.startsWith("/_next/static/chunks/") &&
        url.pathname.endsWith(".js")
      )
        chunks.add(url.href);
    }
  }
  const captured = [];
  for (const url of [...chunks].sort()) {
    const source = await (await response(url)).text();
    if (!/"\[project\]\/(components|lib)\//.test(source)) continue;
    const mapping = source.match(/\/\/# sourceMappingURL=(\S+)/)?.[1];
    if (!mapping) throw new Error(`Project chunk lacks a source map: ${url}`);
    /** @type {unknown} */
    const sourceMap = await (await response(new URL(mapping, url).href)).json();
    if (!projectSource(sourceMap)) continue;
    captured.push({
      url,
      source,
      sourceMap,
      scriptId: "warmup",
      functions: [
        {
          functionName: "",
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: source.length, count: 0 }],
        },
      ],
    });
  }
  if (!captured.length)
    throw new Error("No compiled project sources found during warmup");
  await mkdir(directory, { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(captured));
  await rename(temporary, destination);
}
