import { api } from "@/lib/api/client";

/** Request Better Auth to begin its current-address and new-address confirmation flow. */
export function requestEmailChange(
  newEmail: string,
  callbackURL?: string,
): Promise<unknown> {
  return api.post("api/auth/change-email", {
    unprefixed: true,
    body: {
      newEmail,
      callbackURL: callbackURL
        ? new URL(callbackURL, window.location.origin).toString()
        : undefined,
    },
  });
}

/** Change the signed-in user's password, requiring their current password. */
export function changePassword(input: {
  readonly currentPassword: string;
  readonly newPassword: string;
}): Promise<unknown> {
  return api.post("api/auth/change-password", {
    unprefixed: true,
    body: { ...input, revokeOtherSessions: true },
  });
}

/** Delete through the application endpoint, which anonymizes retained evidence. */
export function deleteOwnAccount(): Promise<unknown> {
  return api.delete("users/me");
}
