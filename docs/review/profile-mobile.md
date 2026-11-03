# Review the mobile profile editor

The phone editor follows the [final save-failed frame](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=995-7586): heading, error banner, centered avatar, name fields, locked email card and stacked actions. The subsequent [desktop editor follow-up](profile-desktop.md) replaces the desktop profile hero with the final form card. Both layouts use the same draft state and API write.

Open [local profile editing](http://localhost:3001/profile/edit) as a signed-in advisee. This requires the disposable API on port 3200 and frontend on 3001; it is not a deployed preview. Start the frontend with `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev --port 3001` after starting the API against the named local proof database.

1. At phone width, change the display name and save. Reload the profile to check persistence.
2. Abort the profile PATCH in browser developer tools and save again. The banner appears above the photo with the returned error; edits remain available for retry.
3. Remove the fault and retry. Name fields, photo controls and Save stay disabled while the request is pending. The successful result returns to the profile and survives reload.
4. Clear the display name and save. The required-field error appears and focus returns to the visible phone field.

Run `AUTH_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/profile-recovery-live.spec.ts` against the disposable proof services. The desktop and phone scenarios inject only the first transport failure and hold the real retry response to inspect pending controls. The retry writes and persistence reads use the real API. Tests restore the demo account's original names.

The 402px comparison omits the design's OS status and home-indicator bars because the browser does not render those. Live names, email and avatar remain account data. The demo account has no avatar, so the avatar endpoint returns an expected 404 and the UI shows initials. Error text describes retained form edits and reports the actual failure; it does not promise storage across a browser restart. Its shorter text changes the banner height and the positions below it. The account-settings link remains actionable. These differences are labelled beside the PR comparison.

The live checks pass at 390px and 1440px, including failed-write persistence, visible error reason, one successful retry, pending controls and saved state after reload. A separate 402px browser check confirms required-field focus, 354px-wide and 36px-high input geometry, no horizontal overflow and no browser exceptions. The only HTTP errors in that check are the expected missing-avatar responses.

Desktop visual acceptance, other profile states, deployment and the complete authentication workload remain open in #56. No API or schema change is included.
