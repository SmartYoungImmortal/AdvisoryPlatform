import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ok = (body: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test/");
  fetchMock = vi.fn().mockImplementation(() => Promise.resolve(ok({ status: true })));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function auth() {
  return import("@/lib/api/auth");
}

function call(index = 0): [string, RequestInit] {
  return fetchMock.mock.calls[index] as [string, RequestInit];
}

describe("better-auth transport calls", () => {
  it("sends sign-in and sign-up to the unprefixed auth endpoints with cookies", async () => {
    const { signIn, signUp } = await auth();
    await signIn({ email: "advisor@example.test", password: "Password-123!" });
    await signUp({
      email: "new@example.test",
      password: "Password-123!",
      name: "New",
      fullName: "New Advisor",
    });

    expect(call(0)[0]).toBe("https://api.test/api/auth/sign-in/email");
    expect(call(0)[1]).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(String(call(0)[1].body))).toEqual({
      email: "advisor@example.test",
      password: "Password-123!",
    });
    expect(call(1)[0]).toBe("https://api.test/api/auth/sign-up/email");
    expect(JSON.parse(String(call(1)[1].body))).toMatchObject({
      timezone: "Asia/Bangkok",
      name: "New",
      fullName: "New Advisor",
    });
  });

  it("sends verification resend and password reset requests without the API prefix", async () => {
    const { sendVerificationEmail, requestPasswordReset, resetPassword } = await auth();
    await sendVerificationEmail({ email: "reader@example.test", callbackURL: "https://app.test/email-verified" });
    await requestPasswordReset({ email: "reader@example.test", redirectTo: "https://app.test/reset-password" });
    await resetPassword({ token: "one-time", newPassword: "Password-456!" });

    expect(call(0)[0]).toBe("https://api.test/api/auth/send-verification-email");
    expect(call(1)[0]).toBe("https://api.test/api/auth/request-password-reset");
    expect(call(2)[0]).toBe("https://api.test/api/auth/reset-password");
    expect(JSON.parse(String(call(2)[1].body))).toEqual({ token: "one-time", newPassword: "Password-456!" });
  });

  it("handles sign-out, a null session, health, and role spellings", async () => {
    const { signOut, getSession, authOk, isAdminRole } = await auth();
    await signOut();
    fetchMock.mockResolvedValueOnce(ok(null));
    await expect(getSession()).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce(ok({ ok: true }));
    await expect(authOk()).resolves.toEqual({ ok: true });
    expect(call(0)[0]).toBe("https://api.test/api/auth/sign-out");
    expect(call(1)[0]).toBe("https://api.test/api/auth/get-session");
    expect(call(2)[0]).toBe("https://api.test/api/auth/ok");
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("ADVISEE,ADMIN")).toBe(true);
    expect(isAdminRole("advisor")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});
