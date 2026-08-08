/**
 * Generates `public/openapi.json` from `lib/api/contract.ts`.
 *
 * Run it with `pnpm api:spec`. The spec is a build artefact of the contract, so
 * it cannot drift from the code the way a hand-written document does — if an
 * endpoint changes shape, regenerating is the only way to change the spec.
 *
 * It also runs `assertContractIntegrity()`, which is what actually catches a
 * `:param` with no matching input field or two endpoints claiming one route.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { z } from "zod";

import {
  assertContractIntegrity,
  contract,
  pathParams,
  type AuthLevel,
  type Endpoint,
} from "../lib/api/contract";
import { ApiErrorBody, STATUS_BY_CODE } from "../lib/api/errors";

const OUT = resolve(import.meta.dirname, "../public/openapi.json");

const AUTH_NOTE: Record<AuthLevel, string> = {
  public: "No session required.",
  user: "Requires a signed-in user. 401 UNAUTHENTICATED otherwise.",
  advisor: "Requires a signed-in user whose role is `advisor`. 403 FORBIDDEN otherwise.",
};

/**
 * `io` matters: a field with `.default()` is optional on the way in but always
 * present on the way out. Describing a query param in output mode would mark
 * `limit` required and mislead the backend into rejecting a call that omits it.
 */
function jsonSchema(schema: z.ZodType, io: "input" | "output") {
  return z.toJSONSchema(schema, { target: "openapi-3.0", io });
}

function isVoid(schema: z.ZodType) {
  return schema instanceof z.ZodVoid;
}

/** Fields that aren't path params — the query string or the request body. */
function payloadShape(endpoint: Endpoint) {
  if (isVoid(endpoint.input)) return null;
  if (!(endpoint.input instanceof z.ZodObject)) return endpoint.input;

  const params = new Set(pathParams(endpoint.path));
  const shape = (endpoint.input as z.ZodObject).shape;
  const rest = Object.fromEntries(
    Object.entries(shape).filter(([k]) => !params.has(k)),
  );
  return Object.keys(rest).length ? z.object(rest) : null;
}

function build() {
  assertContractIntegrity();

  const paths: Record<string, Record<string, unknown>> = {};

  for (const [key, endpoint] of Object.entries(contract) as [string, Endpoint][]) {
    // OpenAPI wants `/api/x/{id}`, the contract uses `/api/x/:id`.
    const openApiPath = endpoint.path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
    const method = endpoint.method.toLowerCase();
    const params = pathParams(endpoint.path);
    const payload = payloadShape(endpoint);
    const sendsBody = endpoint.method === "POST" || endpoint.method === "PATCH";

    const parameters: unknown[] = params.map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" },
    }));

    if (payload && !sendsBody && payload instanceof z.ZodObject) {
      const schema = jsonSchema(payload, "input") as {
        properties?: Record<string, unknown>;
        required?: string[];
      };
      for (const [name, prop] of Object.entries(schema.properties ?? {})) {
        parameters.push({
          name,
          in: "query",
          required: schema.required?.includes(name) ?? false,
          schema: prop,
        });
      }
    }

    paths[openApiPath] ??= {};
    paths[openApiPath][method] = {
      operationId: key,
      summary: endpoint.summary,
      description: `${endpoint.summary}\n\n${AUTH_NOTE[endpoint.auth]}`,
      tags: [key.split(".")[0]],
      ...(parameters.length ? { parameters } : {}),
      ...(payload && sendsBody
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: jsonSchema(payload, "input") } },
            },
          }
        : {}),
      responses: {
        200: {
          description: "OK",
          content: isVoid(endpoint.output)
            ? undefined
            : { "application/json": { schema: jsonSchema(endpoint.output, "output") } },
        },
        default: {
          description: "Error. `code` selects which failure screen the UI shows.",
          content: { "application/json": { schema: jsonSchema(ApiErrorBody, "output") } },
        },
      },
    };
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Advisory Platform API",
      version: "0.1.0",
      description:
        "Generated from lib/api/contract.ts — do not edit by hand.\n\n" +
        "Served by one Cloudflare Worker alongside the static site: page requests " +
        "are answered from the assets store and never invoke the Worker, only " +
        "`/api/*` does. Auth lives at `/api/auth/*` and is handled by better-auth, " +
        "so it is not described here.\n\n" +
        "Money is always minor units (satang) as an integer; dates are always ISO 8601 UTC.",
    },
    servers: [{ url: "https://advisory-platform.nsza.workers.dev" }],
    paths,
    "x-error-codes": STATUS_BY_CODE,
  };
}

const spec = build();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(spec, null, 2)}\n`, "utf8");

const count = Object.values(spec.paths).reduce(
  (n, ops) => n + Object.keys(ops).length,
  0,
);
console.log(`openapi.json written — ${count} operations`);
