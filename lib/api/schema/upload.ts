import { z } from "zod";

import { Id } from "./common";

/**
 * Uploads are two-step so file bytes never pass through the Worker — a Worker
 * on the Free plan has a 10ms CPU budget and streaming a 4MB ID scan through it
 * is exactly how that budget is blown.
 *
 * 1. `uploads.create` → a short-lived presigned PUT URL for the R2 bucket
 * 2. the browser PUTs the file straight to `uploadUrl`
 * 3. the returned `id` is then attached to a profile or an application
 */
export const UploadPurpose = z.enum([
  "profile-photo",
  "identity-document",
  "credential-document",
  "chat-attachment",
]);

export const CreateUploadInput = z.object({
  purpose: UploadPurpose,
  contentType: z.string().min(1),
  /** Bytes. The backend rejects oversize files here rather than after the PUT. */
  sizeBytes: z.int().positive(),
});

export const Upload = z.object({
  id: Id,
  /** Presigned PUT target. Expires — treat as single-use. */
  uploadUrl: z.url(),
  /** Where the file will be readable once the PUT succeeds. */
  publicUrl: z.url(),
});

export type UploadPurpose = z.infer<typeof UploadPurpose>;
export type CreateUploadInput = z.infer<typeof CreateUploadInput>;
export type Upload = z.infer<typeof Upload>;
