import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function submittedBody() {
  const options = fetchMock.mock.calls[0]?.[1];
  if (typeof options?.body !== "string") throw new Error("Expected a JSON request body");
  return JSON.parse(options.body);
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/");
  vi.stubGlobal("window", { location: { origin: "https://app.example.test" } });
  fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ status: true }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("account API contracts", () => {
  it("changes a password with authenticated session revocation and preserves the auth response", async () => {
    const response = { token: "replacement-session", user: { id: "own-user" } };
    fetchMock.mockResolvedValueOnce(jsonResponse(response));
    const { changePassword } = await import("@/lib/api/account");

    await expect(changePassword({ currentPassword: "Old-Password-123!", newPassword: "New-Password-456!" })).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/auth/change-password", expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(submittedBody()).toEqual({ currentPassword: "Old-Password-123!", newPassword: "New-Password-456!", revokeOtherSessions: true });
  });

  it("preserves wrong-current-password errors so the form can identify rejection", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Invalid password", code: "INVALID_PASSWORD" }, 400));
    const { changePassword } = await import("@/lib/api/account");

    await expect(changePassword({ currentPassword: "Wrong-Password-123!", newPassword: "New-Password-456!" })).rejects.toMatchObject({ name: "ApiError", status: 400, message: "Invalid password", code: "INVALID_PASSWORD" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends an absolute frontend callback for both mailbox confirmations", async () => {
    const { requestEmailChange } = await import("@/lib/api/account");
    await requestEmailChange("new@example.test", "/settings/email/verify?to=new%40example.test");

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/auth/change-email", expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(submittedBody()).toEqual({ newEmail: "new@example.test", callbackURL: "https://app.example.test/settings/email/verify?to=new%40example.test" });
  });

  it("preserves a supplied absolute callback instead of resolving it against the API", async () => {
    const { requestEmailChange } = await import("@/lib/api/account");
    await requestEmailChange("new@example.test", "https://review.example.test/settings/email/verify");
    expect(submittedBody()).toEqual({ newEmail: "new@example.test", callbackURL: "https://review.example.test/settings/email/verify" });
  });

  it("omits an absent callback without requiring a browser location", async () => {
    vi.stubGlobal("window", undefined);
    const { requestEmailChange } = await import("@/lib/api/account");
    await expect(requestEmailChange("new@example.test")).resolves.toEqual({ status: true });
    expect(submittedBody()).toEqual({ newEmail: "new@example.test" });
  });

  it("deletes through the application endpoint and accepts an empty success response", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { deleteOwnAccount } = await import("@/lib/api/account");
    await expect(deleteOwnAccount()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/v1/users/me", expect.objectContaining({ method: "DELETE", credentials: "include" }));
  });

  it.each([
    { status: 401, message: "Unauthorized" },
    { status: 409, message: "Cancel upcoming appointments before deleting your account" },
  ])("preserves account-deletion $status failures without pretending deletion succeeded", async ({ status, message }) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ statusCode: status, message }, status));
    const { deleteOwnAccount } = await import("@/lib/api/account");
    await expect(deleteOwnAccount()).rejects.toMatchObject({ name: "ApiError", status, message });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
