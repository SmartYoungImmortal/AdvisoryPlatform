import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";

/**
 * drizzle-kit runs on Node, not in the Worker, so it reads the connection
 * string from `.dev.vars` (gitignored) or the environment. The Worker itself
 * never touches this file.
 */
function connectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const match = readFileSync(".dev.vars", "utf8").match(/DATABASE_URL="([^"]+)"/);
    if (match) return match[1];
  } catch {
    // fall through
  }
  throw new Error(
    "DATABASE_URL is not set. Put it in .dev.vars or export it before running drizzle-kit.",
  );
}

export default defineConfig({
  out: "./worker/db/migrations",
  schema: "./worker/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: connectionString() },
  casing: "snake_case",
});
