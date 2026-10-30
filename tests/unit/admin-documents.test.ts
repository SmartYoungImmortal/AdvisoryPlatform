import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { get } }));

import { getIdentityDocumentUrl, getSkillProofDocumentUrl } from "@/lib/api/admin";

describe("private admin review documents", () => {
  beforeEach(() => get.mockReset());

  it.each([
    [getIdentityDocumentUrl, "admin/identity-verifications/applicant/document-url"],
    [getSkillProofDocumentUrl, "admin/skill-proofs/applicant/document-url"],
  ])("requests the authorized URL on every read", async (read, route) => {
    const signal = new AbortController().signal;
    get.mockResolvedValueOnce({ url: "https://storage.test/first", expiresInSeconds: 300 });
    get.mockResolvedValueOnce({ url: "https://storage.test/second", expiresInSeconds: 300 });
    expect(await read("applicant", signal)).toEqual({ url: "https://storage.test/first", expiresInSeconds: 300 });
    expect(await read("applicant", signal)).toEqual({ url: "https://storage.test/second", expiresInSeconds: 300 });
    expect(get).toHaveBeenNthCalledWith(1, route, { signal });
    expect(get).toHaveBeenNthCalledWith(2, route, { signal });
  });

  it.each([getIdentityDocumentUrl, getSkillProofDocumentUrl])("preserves permission and missing-document failures", async (read) => {
    for (const message of ["Forbidden", "Identity document not found"]) {
      const error = new Error(message);
      get.mockRejectedValueOnce(error);
      await expect(read("applicant")).rejects.toBe(error);
    }
  });
});
