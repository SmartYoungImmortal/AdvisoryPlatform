import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
const response = (body: unknown, status = 200, statusText = "") => new Response(JSON.stringify(body), {
  status, statusText, headers: { "Content-Type": "application/json" },
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/");
  fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => response({ data: null }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("shared API transport", () => {
  it("unwraps application data and encodes filters without dropping false or zero", async () => {
    const bookings = [{ appointmentId: "booking-1", state: "BOOKED" }];
    fetchMock.mockResolvedValueOnce(response({ statusCode: 200, message: "OK", data: bookings }));
    const { api } = await import("@/lib/api/client");

    await expect(api.get("/bookings/me", { query: { page: 0, active: false, search: "a & b", omitted: undefined } })).resolves.toEqual(bookings);
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/v1/bookings/me?page=0&active=false&search=a+%26+b", expect.objectContaining({ method: "GET", credentials: "include", headers: { Accept: "application/json" }, body: undefined }));
  });

  it("preserves raw auth replies including the null signed-out session", async () => {
    fetchMock.mockResolvedValueOnce(response({ user: { id: "own-user" } })).mockResolvedValueOnce(response(null));
    const { api } = await import("@/lib/api/client");
    await expect(api.post("api/auth/sign-in/email", { unprefixed: true, body: { email: "own@example.test" } })).resolves.toEqual({ user: { id: "own-user" } });
    await expect(api.get("api/auth/get-session", { unprefixed: true })).resolves.toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["https://api.example.test/api/auth/sign-in/email", "https://api.example.test/api/auth/get-session"]);
  });

  it("serializes PATCH and PUT bodies and allows DELETE with no response body", async () => {
    const { api } = await import("@/lib/api/client");
    await api.patch("users/me", { body: { displayName: "Updated" } });
    await api.put("availability", { body: { enabled: true } });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.delete("users/me")).resolves.toBeNull();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH", body: JSON.stringify({ displayName: "Updated" }), headers: { "Content-Type": "application/json" } });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PUT", body: JSON.stringify({ enabled: true }) });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: "DELETE", body: undefined });
  });

  it("leaves multipart boundaries to the browser and sends the actual file form", async () => {
    const form = new FormData();
    form.append("file", new File(["proof"], "proof.txt", { type: "text/plain" }));
    const { api } = await import("@/lib/api/client");
    await api.post("chat/attachments", { body: form });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(form);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({ Accept: "application/json" });
  });

  it.each([
    { status: 401, message: "Sign in again", unauthenticated: true, forbidden: false },
    { status: 403, message: "Not your booking", unauthenticated: false, forbidden: true },
    { status: 409, message: "Slot already taken", unauthenticated: false, forbidden: false },
  ])("distinguishes $status so callers can choose sign-in, denial or reconciliation", async ({ status, message, unauthenticated, forbidden }) => {
    fetchMock.mockResolvedValueOnce(response({ statusCode: status, message, code: "DOMAIN_ERROR" }, status));
    const { api, ApiError } = await import("@/lib/api/client");
    try {
      await api.post("bookings");
      throw new Error("Expected request rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (!(error instanceof ApiError)) throw error;
      expect(error).toMatchObject({ status, message, code: "DOMAIN_ERROR" });
      expect(error.isUnauthenticated).toBe(unauthenticated);
      expect(error.isForbidden).toBe(forbidden);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps an HTML gateway error as an HTTP failure rather than a JSON parsing error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<h1>Unavailable</h1>", { status: 502, statusText: "Bad Gateway" }));
    const { api } = await import("@/lib/api/client");
    await expect(api.get("services")).rejects.toMatchObject({ name: "ApiError", status: 502, message: "Bad Gateway" });
  });

  it("falls back safely when an HTTP error contains no usable message or code", async () => {
    fetchMock.mockResolvedValueOnce(response(null, 500)).mockResolvedValueOnce(response({ message: 42, code: 42 }, 500, "Server Error"));
    const { api } = await import("@/lib/api/client");
    await expect(api.get("services")).rejects.toMatchObject({ name: "ApiError", status: 500, message: "Request failed", code: undefined });
    await expect(api.get("services")).rejects.toMatchObject({ name: "ApiError", status: 500, message: "Server Error", code: undefined });
  });

  it("reports malformed successful JSON as an unusable response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    const { api } = await import("@/lib/api/client");
    await expect(api.get("services")).rejects.toMatchObject({ name: "ApiUnreachableError", message: "The API could not be reached" });
  });

  it("preserves a network cause without retrying a mutation", async () => {
    const cause = new TypeError("Network unavailable");
    fetchMock.mockRejectedValueOnce(cause);
    const { api } = await import("@/lib/api/client");
    await expect(api.post("bookings", { body: { slot: "selected" } })).rejects.toMatchObject({ name: "ApiUnreachableError", cause });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes caller cancellation through unchanged with its AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();
    const cause = new DOMException("Cancelled", "AbortError");
    fetchMock.mockRejectedValueOnce(cause);
    const { api } = await import("@/lib/api/client");
    await expect(api.get("services", { signal: controller.signal })).rejects.toBe(cause);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it("refuses requests when the build has no API configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
    const { api, isApiConfigured, apiSocketTarget } = await import("@/lib/api/client");
    expect(isApiConfigured).toBe(false);
    expect(apiSocketTarget("chat")).toBeNull();
    await expect(api.get("users/me")).rejects.toMatchObject({ name: "ApiUnreachableError", cause: "NEXT_PUBLIC_API_URL was not set when this build was made" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed API configuration without issuing a request", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "not-a-url");
    const { api, apiSocketTarget } = await import("@/lib/api/client");
    expect(apiSocketTarget("chat")).toBeNull();
    await expect(api.get("users/me")).rejects.toMatchObject({ name: "ApiUnreachableError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retains a deployment mount path for sockets while placing the namespace on the origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/backend/");
    const { apiSocketTarget } = await import("@/lib/api/client");
    expect(apiSocketTarget("/chat")).toEqual({ url: "https://api.example.test/chat", path: "/backend/socket.io" });
  });
});
