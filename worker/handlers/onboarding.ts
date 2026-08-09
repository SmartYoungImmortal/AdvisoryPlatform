import { and, desc, eq, inArray } from "drizzle-orm";

import type {
  EndpointKey,
  Handlers,
  InputOf,
  OutputOf,
} from "@/lib/api/contract";
import { apiError } from "@/lib/api/errors";
import type { AdvisorApplication, ApplicationStatus } from "@/lib/api/schema";

import type { WorkerContext } from "../context";
import type { Db } from "../db";
import { schema } from "../db";

/**
 * Advisor onboarding — the three-stage application plus the upload endpoint
 * that feeds its two documents.
 *
 * Two invariants run through the whole file:
 *
 * 1. **The newest row is the application.** A rejection starts a fresh row
 *    rather than reopening the old one (see `worker/db/schema/advisor.ts`), so
 *    every read is "latest by createdAt", never "the row for this user".
 * 2. **`stage` only ever moves forward.** It is what the wizard renders as
 *    "ขั้นตอนที่ n จาก 3"; sending back a lower number would bounce an
 *    applicant who edited an earlier answer to the start of the form.
 */

/**
 * Adapts a Worker handler to the contract's signature.
 *
 * `Handlers` types `ctx` as `HandlerContext` — the narrow shape the mock
 * backend can also satisfy — while the Worker always passes a `WorkerContext`,
 * which extends it with `db`/`env`. Under `strictFunctionTypes` a function that
 * *demands* the wider parameter is not assignable to one that promises to
 * accept the narrower, so the widening happens here once instead of as a cast
 * inside every handler. It is sound because `worker/index.ts` is the only
 * caller and builds a full `WorkerContext` per request; `input` and the return
 * type are still checked against the contract, which is the part that matters.
 */
function handler<K extends EndpointKey>(
  fn: (input: InputOf<K>, ctx: WorkerContext) => Promise<OutputOf<K>>,
): Handlers[K] {
  return fn as Handlers[K];
}

type ApplicationRow = typeof schema.advisorApplication.$inferSelect;

/**
 * The statuses whose row still belongs to the applicant. Anything else belongs
 * to the reviewer, and a row must not change under a reviewer mid-review — that
 * is how an ID scan gets approved that nobody actually looked at.
 *
 * Editing a `more-info-needed` row puts it back to `draft`: it is the
 * applicant's again until they resubmit. `reviewerNote` survives that, because
 * it is the only place the UI can read *what* the reviewer asked for.
 */
const APPLICANT_EDITABLE: string[] = ["draft", "more-info-needed"];

/** Which upload purpose each document stage accepts. */
const PURPOSE_BY_STAGE = {
  2: "identity-document",
  3: "credential-document",
} as const;

/**
 * The documented File Storage ceiling. Checked here rather than after the PUT,
 * because once the browser has streamed 200MB into the bucket the only thing
 * left to do about it is pay for it.
 */
const MAX_UPLOAD_MB = 50;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * Scans and certificates are images or PDFs. Nothing executable, nothing SVG —
 * an SVG served from the bucket's origin is a stored XSS, not a picture.
 */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function isEditable(row: ApplicationRow): boolean {
  return APPLICANT_EDITABLE.includes(row.status);
}

/**
 * `status` is free text in Postgres but a closed union on the wire. An
 * unrecognised value means schema drift, and the safe reading of drift is "a
 * human has it": answering `draft` would reopen the form over an application
 * that may already be approved.
 */
function toStatus(raw: string): ApplicationStatus {
  switch (raw) {
    case "draft":
    case "submitted":
    case "pending":
    case "more-info-needed":
    case "approved":
    case "rejected":
      return raw;
    default:
      return "pending";
  }
}

/** The column is a plain integer; the contract's union is 1 | 2 | 3. */
function toStage(raw: number): AdvisorApplication["stage"] {
  if (raw >= 3) return 3;
  if (raw <= 1) return 1;
  return 2;
}

function toApplication(row: ApplicationRow): AdvisorApplication {
  return {
    id: row.id,
    status: toStatus(row.status),
    stage: toStage(row.stage),
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    reviewerNote: row.reviewerNote ?? null,
  };
}

/** The caller's most recent application — one query, always scoped by user. */
async function latestApplication(
  db: Db,
  userId: string,
): Promise<ApplicationRow | undefined> {
  const [row] = await db
    .select()
    .from(schema.advisorApplication)
    .where(eq(schema.advisorApplication.userId, userId))
    .orderBy(desc(schema.advisorApplication.createdAt))
    .limit(1);
  return row;
}

export interface PresignedUpload {
  /** Short-lived PUT target. Treat as single use. */
  uploadUrl: string;
  /** Where the object becomes readable once the PUT lands. */
  publicUrl: string;
}

/** Long enough to push 50MB over a bad mobile connection, short enough to leak little. */
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

/**
 * ⚠️ STUB — R2 IS NOT WIRED YET. This issues a fake, deterministic URL.
 *
 * TODO(r2): add an R2 bucket binding named `UPLOADS` to `wrangler.jsonc` (and
 * to `Env` in `worker/worker-env.d.ts`, plus the `env.qa` block, which inherits
 * nothing), then replace the two URLs below with a real S3 SigV4 presigned PUT
 * against the bucket's S3 endpoint and a `publicUrl` on the bucket's public
 * custom domain. Everything downstream — the `upload` row, `attachDocument`,
 * `profile.setPhoto` — is written against this return value, so switching to
 * real R2 is a change to this function and nothing else.
 *
 * The host is under the reserved `.invalid` TLD on purpose: a stub URL that
 * resolves to nothing fails loudly in the browser instead of silently PUTting
 * a national ID scan at somebody else's server.
 */
export function presignUpload(opts: {
  env: Env;
  key: string;
  contentType: string;
}): PresignedUpload {
  const origin = `https://uploads-stub.${opts.env.APP_ENV}.invalid`;
  const type = encodeURIComponent(opts.contentType);
  const query = `ttl=${UPLOAD_URL_TTL_SECONDS}&content-type=${type}`;
  return {
    uploadUrl: `${origin}/put/${opts.key}?${query}`,
    publicUrl: `${origin}/files/${opts.key}`,
  };
}

export const onboardingHandlers = {
  "application.get": handler<"application.get">(async (_input, ctx) => {
    const user = ctx.requireUser();
    const row = await latestApplication(ctx.db, user.id);
    return row ? toApplication(row) : null;
  }),

  "application.saveStage1": handler<"application.saveStage1">(async (input, ctx) => {
    const user = ctx.requireUser();
    const existing = await latestApplication(ctx.db, user.id);

    // A rejected attempt is finished: the next save starts a new row so the
    // reviewer's trail on the old one survives. Submitted/pending/approved are
    // not the applicant's to edit.
    if (existing && !isEditable(existing) && existing.status !== "rejected") {
      throw apiError("CONFLICT", "This application is already under review");
    }

    const details = {
      legalName: input.legalName,
      phone: input.phone,
      birthDate: input.birthDate,
      bio: input.bio,
    };

    if (existing && isEditable(existing)) {
      const [row] = await ctx.db
        .update(schema.advisorApplication)
        .set({
          ...details,
          status: "draft",
          // Finishing stage 1 moves the wizard to stage 2; `max` rather than a
          // literal so coming back to fix a typo at stage 3 does not rewind it.
          stage: Math.max(existing.stage, 2),
        })
        .where(
          and(
            eq(schema.advisorApplication.id, existing.id),
            // Ownership belongs in the WHERE even though the row was fetched by
            // userId — the two statements are not one transaction here.
            eq(schema.advisorApplication.userId, user.id),
          ),
        )
        .returning();
      if (!row) throw apiError("NOT_FOUND", "Application vanished while saving");
      return toApplication(row);
    }

    const [row] = await ctx.db
      .insert(schema.advisorApplication)
      .values({ userId: user.id, status: "draft", stage: 2, ...details })
      .returning();
    return toApplication(row);
  }),

  "application.attachDocument": handler<"application.attachDocument">(async (input, ctx) => {
    const user = ctx.requireUser();

    // Ownership is in the WHERE, not a check after the read: fetching another
    // user's upload row first is already the leak, whatever we do with it next.
    const [upload] = await ctx.db
      .select({
        id: schema.upload.id,
        status: schema.upload.status,
        purpose: schema.upload.purpose,
      })
      .from(schema.upload)
      .where(and(eq(schema.upload.id, input.uploadId), eq(schema.upload.userId, user.id)))
      .limit(1);

    // Missing, somebody else's, still `pending` (the bytes never arrived) and
    // `rejected` by moderation all collapse to one code deliberately: the
    // applicant gets the upload-rejected screen and learns nothing about which
    // ids exist.
    if (!upload || upload.status !== "complete") {
      throw apiError("UPLOAD_REJECTED", "That upload cannot be attached");
    }

    // An ID scan uploaded as a chat attachment would sit in a bucket prefix
    // with different retention and moderation rules, so the purpose has to
    // match the stage it is being attached to.
    const expectedPurpose = PURPOSE_BY_STAGE[input.stage];
    if (upload.purpose !== expectedPurpose) {
      throw apiError(
        "UPLOAD_REJECTED",
        `Stage ${input.stage} expects a "${expectedPurpose}" upload`,
      );
    }

    const existing = await latestApplication(ctx.db, user.id);
    if (!existing) {
      throw apiError("NOT_FOUND", "Save stage 1 before attaching documents");
    }
    if (!isEditable(existing)) {
      throw apiError("CONFLICT", "This application is already under review");
    }

    const [row] = await ctx.db
      .update(schema.advisorApplication)
      .set({
        ...(input.stage === 2
          ? { idDocumentUploadId: upload.id }
          : { skillProofUploadId: upload.id }),
        status: "draft",
        // Attaching completes that stage, so the wizard moves on — clamped at 3
        // because there is no stage 4, only `application.submit`.
        stage: Math.min(3, Math.max(existing.stage, input.stage + 1)),
      })
      .where(
        and(
          eq(schema.advisorApplication.id, existing.id),
          eq(schema.advisorApplication.userId, user.id),
        ),
      )
      .returning();
    if (!row) throw apiError("NOT_FOUND", "Application vanished while saving");
    return toApplication(row);
  }),

  "application.submit": handler<"application.submit">(async (_input, ctx) => {
    const user = ctx.requireUser();
    const existing = await latestApplication(ctx.db, user.id);
    if (!existing) throw apiError("NOT_FOUND", "There is no application to submit");
    if (existing.status === "approved") {
      throw apiError("CONFLICT", "This application was already approved");
    }
    if (!isEditable(existing)) {
      throw apiError("CONFLICT", "This application is already under review");
    }

    // Keys are the `ApplicationStage1Input` field names and the two document
    // columns, so the form drops each message into the slot next to the input
    // that is actually empty instead of showing one banner for five mistakes.
    const fields: Record<string, string> = {};
    if (!existing.legalName?.trim()) fields.legalName = "Required";
    if (!existing.phone?.trim()) fields.phone = "Required";
    if (!existing.birthDate?.trim()) fields.birthDate = "Required";
    if (!existing.idDocumentUploadId) fields.idDocumentUploadId = "Required";
    if (!existing.skillProofUploadId) fields.skillProofUploadId = "Required";
    if (Object.keys(fields).length > 0) {
      throw apiError("VALIDATION_FAILED", "Application is incomplete", fields);
    }

    const [row] = await ctx.db
      .update(schema.advisorApplication)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        // Everything is filled in, so the wizard is at its last step whatever
        // the applicant last touched.
        stage: 3,
        // A note from the previous round describes a version the reviewer has
        // already seen; leaving it renders "more info needed" over an
        // application that is back in the queue.
        reviewerNote: null,
      })
      .where(
        and(
          eq(schema.advisorApplication.id, existing.id),
          eq(schema.advisorApplication.userId, user.id),
          // The status guard is repeated in the WHERE, not trusted from the
          // read above: a double-tap on the submit button must not restamp
          // `submittedAt` and push the row back down the reviewer queue.
          inArray(schema.advisorApplication.status, APPLICANT_EDITABLE),
        ),
      )
      .returning();
    if (!row) throw apiError("CONFLICT", "This application was already submitted");
    return toApplication(row);
  }),

  "uploads.create": handler<"uploads.create">(async (input, ctx) => {
    const user = ctx.requireUser();

    // Both limits are enforced before a URL exists: a presigned PUT is a
    // capability, and one handed out for a 200MB executable cannot be recalled.
    // Parameters are legal on a content type ("image/jpeg; charset=binary"), so
    // compare the media type alone or a well-formed header gets rejected.
    const contentType = input.contentType.split(";")[0].trim().toLowerCase();
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
    if (!extension) {
      throw apiError("UPLOAD_REJECTED", `Unsupported content type: ${input.contentType}`);
    }
    if (input.sizeBytes > MAX_UPLOAD_BYTES) {
      throw apiError("UPLOAD_REJECTED", `Files are limited to ${MAX_UPLOAD_MB}MB`);
    }

    // No user id in the key: `publicUrl` is world-readable and an object path
    // that spells out who owns it turns the bucket into a user directory.
    // Ownership lives on the row, which is where every check reads it from.
    const key = `${input.purpose}/${crypto.randomUUID()}.${extension}`;
    const { uploadUrl, publicUrl } = presignUpload({ env: ctx.env, key, contentType });

    // Inserted as `pending`: the id is unusable until something confirms the
    // bytes landed, so a client cannot attach a file it never sent.
    // TODO(r2): nothing flips this to `complete` yet — the contract has no
    // confirm endpoint. Wire an R2 event notification (or an internal
    // /api/uploads/:id/complete) when the bucket lands, or `attachDocument`
    // will keep answering UPLOAD_REJECTED for genuinely uploaded files.
    const [row] = await ctx.db
      .insert(schema.upload)
      .values({
        userId: user.id,
        purpose: input.purpose,
        contentType,
        sizeBytes: input.sizeBytes,
        r2Key: key,
        publicUrl,
        status: "pending",
      })
      .returning({ id: schema.upload.id });

    return { id: row.id, uploadUrl, publicUrl };
  }),
} satisfies Pick<
  Handlers,
  | "application.get"
  | "application.saveStage1"
  | "application.attachDocument"
  | "application.submit"
  | "uploads.create"
>;
