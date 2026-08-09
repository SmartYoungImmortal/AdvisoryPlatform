import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * A database handle for one request.
 *
 * **Never hoist this to module scope.** Cloudflare has no `process.env` at
 * import time, and an isolate is shared across requests — a module-level client
 * built from the first request's `env` is both undefined-at-import and a
 * cross-request leak waiting to happen. Build it per request from `env`.
 *
 * The HTTP driver is used rather than `pg`: the Workers runtime has no TCP
 * sockets, so `drizzle-orm/node-postgres` cannot run here at all.
 *
 * Caveat that will bite eventually: `neon-http` has **no interactive
 * transactions**. Use `db.batch([...])` for multi-statement writes. If a real
 * transaction becomes necessary — creating a booking and its invoice together
 * is the likely first case — swap this import for `drizzle-orm/neon-serverless`
 * (WebSocket). Same schema, same queries, one line.
 */
export function createDb(env: Env) {
  return drizzle(neon(env.DATABASE_URL), { schema });
}

export type Db = ReturnType<typeof createDb>;
export { schema };
