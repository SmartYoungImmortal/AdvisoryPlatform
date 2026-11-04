import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChangeEmailScreen } from "@/components/profile/email-screens";
import { requestEmailChange } from "@/lib/api/account";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import th from "@/messages/th.json";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings/email",
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/api/account", () => ({ requestEmailChange: vi.fn() }));
vi.mock("@/components/session/account-bits", () => ({
  useAccount: () => ({ email: "current@example.com" }),
}));
// The settings page behind the dialog is not what is under test.
vi.mock("@/components/profile/account-settings-screen", () => ({
  AccountSettingsScreen: ({ overlay }: { readonly overlay: ReactNode }) => overlay,
}));

const IN_USE = th.changeEmail.inUseFieldError;
const FAILED = th.changeEmail.requestFailed;
const NEW_EMAIL = "taken@example.com";

function submitWith(answer: () => Promise<unknown>) {
  vi.mocked(requestEmailChange).mockImplementation(answer);
  render(
    <NextIntlClientProvider locale="th" messages={th} timeZone="Asia/Bangkok">
      <ChangeEmailScreen />
    </NextIntlClientProvider>,
  );
  const field = screen.getByLabelText(th.changeEmail.newLabel);
  fireEvent.change(field, { target: { value: NEW_EMAIL } });
  fireEvent.click(screen.getByRole("button", { name: th.changeEmail.submit }));
  return field;
}

beforeEach(() => push.mockReset());
afterEach(cleanup);

describe("change email: what a refused request says", () => {
  it("409 says the address already has an account, under the field", async () => {
    const field = submitWith(() => Promise.reject(new ApiError(409, "Conflict")));
    expect(await screen.findByText(IN_USE)).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByText(FAILED)).toBeNull();
  });

  for (const [label, error] of [
    ["400", () => new ApiError(400, "Bad Request")],
    ["500", () => new ApiError(500, "Internal Server Error")],
    ["an unreachable API", () => new ApiUnreachableError(new TypeError("Failed to fetch"))],
  ] as const) {
    it(`${label} says the request did not go through, and leaves the field unmarked`, async () => {
      const field = submitWith(() => Promise.reject(error()));
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toBe(FAILED);
      expect(document.body.textContent).not.toContain(IN_USE);
      expect(field.getAttribute("aria-invalid")).not.toBe("true");
    });
  }

  it("a sent request moves on to the verify note for that address", async () => {
    submitWith(() => Promise.resolve(undefined));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/settings/email/verify?to=${encodeURIComponent(NEW_EMAIL)}`),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("the in-use frame still draws its state", () => {
    render(
      <NextIntlClientProvider locale="th" messages={th} timeZone="Asia/Bangkok">
        <ChangeEmailScreen state="in-use" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(IN_USE)).toBeTruthy();
  });
});
