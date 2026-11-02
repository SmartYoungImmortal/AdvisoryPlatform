# Review profile save recovery

Profile name fields and photo controls are disabled while a name save is pending. Save also waits for an active photo upload. This prevents a newer edit from being lost when a successful save navigates to the profile.

Use [local profile editing](http://localhost:3001/profile/edit) with a signed-in advisee, the disposable API on port 3200 and frontend on port 3001. Start the frontend with `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev --port 3001`. There is no deployed preview.

1. Change the display name and block the profile PATCH request in browser developer tools. Save. The existing error appears and your edits remain in the form.
2. Remove the fault and retry. While the request is pending, name fields, photo controls and Save are disabled.
3. After success, reload the profile. The saved name remains.

Run `AUTH_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/profile-recovery-live.spec.ts` against the named disposable proof services and demo accounts. Desktop and phone tests check failed-write persistence, retained edits, one real successful retry, pending controls and saved state after reload. They restore the demo account's original names. Only the initial transport failure is injected; the retry uses the real API.

The [phone save-failed reference](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=995-7586) was fetched for comparison. The existing screen's identity section, cover, layout and typography differ from that frame. This change adds disabled behavior to existing controls and does not establish full visual acceptance. No separately approved pending-state frame is available. No backend or schema changes, deployment verification or whole-source coverage claim is included.
