import { describe, expect, it } from "vitest";
import { canAccess, requiredAccess } from "@/lib/session/access";
import { safeNext } from "@/lib/session";

describe("route permission boundaries", () => {
  it("keeps the advisor review inbox restricted while allowing signed-in review submission", () => {
    expect(canAccess(requiredAccess("/reviews"), "advisee")).toBe(false);
    expect(canAccess(requiredAccess("/reviews/empty"), "advisee")).toBe(false);
    expect(canAccess(requiredAccess("/reviews/new"), "advisee")).toBe(true);
    expect(canAccess(requiredAccess("/reviews/new"), null)).toBe(false);
  });

  it("protects nested account/advisor routes without confusing similarly named public pages", () => {
    expect(canAccess(requiredAccess("/settings/email/verify/"), null)).toBe(false);
    expect(canAccess(requiredAccess("/advisor/services/new"), "advisee")).toBe(false);
    expect(canAccess(requiredAccess("/advisor/services/new"), "advisor")).toBe(true);
    expect(canAccess(requiredAccess("/advisor/services-public"), null)).toBe(true);
    expect(canAccess(requiredAccess("/profile-help"), null)).toBe(true);
    expect(requiredAccess("/")).toBe("public");
  });

  it("allows an advisee to apply for advisor status without gaining advisor access", () => {
    expect(canAccess(requiredAccess("/advisor/apply"), "advisee")).toBe(true);
    expect(canAccess(requiredAccess("/advisor-onboarding/proofs"), "advisee")).toBe(true);
    expect(canAccess(requiredAccess("/availability/profiles"), "advisee")).toBe(false);
  });

  it("keeps anonymous users out of private data and permits administrator inspection", () => {
    expect(canAccess("public", null)).toBe(true);
    expect(canAccess("signed-in", null)).toBe(false);
    expect(canAccess("advisor", null)).toBe(false);
    expect(canAccess("signed-in", "advisee")).toBe(true);
    expect(canAccess("advisor", "admin")).toBe(true);
    expect(canAccess("advisee", "advisor")).toBe(false);
  });
});

describe("post-login navigation", () => {
  it("preserves local destinations including their query and fragment", () => {
    expect(safeNext("/bookings/detail?bookingId=own#calendar")).toBe("/bookings/detail?bookingId=own#calendar");
    expect(safeNext("/")).toBe("/");
    const encodedPath = "/%2F%5Coutside.example/?search=hello%20world#details";
    expect(new URL(encodedPath, "https://app.example.test").origin).toBe("https://app.example.test");
    expect(safeNext(encodedPath)).toBe(encodedPath);
  });

  it.each([undefined, null, "", "profile", "https://outside.example/", "//outside.example/", "javascript:alert(1)"])("rejects a nonlocal or absent destination: %s", next => {
    expect(safeNext(next)).toBeNull();
  });

  it.each(["/\\outside.example/", "/\t/outside.example/", "/\n/outside.example/"])("rejects browser-normalized external destinations: %j", next => {
    expect(new URL(next, "https://app.example.test").origin).toBe("https://outside.example");
    expect(safeNext(next)).toBeNull();
  });
});
