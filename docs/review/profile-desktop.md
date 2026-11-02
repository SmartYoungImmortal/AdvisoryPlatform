# Review the desktop profile form

The desktop editor now uses the final form card instead of the profile hero, cover and preview. It has a photo column, compact name fields, a locked email card and right-aligned actions. Save and photo errors appear above the fields. Phone and desktop share one form, one pair of field IDs and the existing API save/upload state.

The change is limited to Taj's own-profile editor and its verification. Shared navigation, the general profile view, advisor dashboards and other owners' pages are untouched. The retained application rail differs from the Figma header/footer, so this is form-content acceptance rather than full-page acceptance.

Use [local profile editing](http://localhost:3001/profile/edit) as a signed-in advisee with the disposable API on 3200 and frontend on 3001. Start the frontend with `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev --port 3001` after starting the local proof API. There is no deployed preview.

1. Edit the display name, save and reload the profile. The saved name remains.
2. Abort the profile PATCH in browser developer tools and save again. The top banner shows the reason, the fields retain edits and Retry remains available. Remove the fault and retry against the real API.
3. Choose an unsupported or oversized photo. The error appears above the form and the portrait has an inset red outline. Choose a valid photo to recover, then reload to confirm persistence.
4. While saving or uploading, verify that Save and the photo control cannot start another operation. Clearing a required name focuses the single visible field.

The design references are [default desktop](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1787-25320), [desktop save failure](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1787-26037), [desktop photo rejection](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1787-25944) and [phone save failure](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=995-7586).

A real browser check at 1440px and 1180px measures the save-failed card at 800 by 496px, matching the desktop frame. Its name input is 508 by 36px. At 402px, the input is 354 by 36px. The check also covers 820px, required-field focus and horizontal overflow. No browser exceptions occur; the demo account's missing-avatar 404 responses are expected and render initials. Full-screen screenshots and the card-only comparison label the retained shell, dynamic account data and honest error-text differences. They are attached outside Git to the PR.

Run `AUTH_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/profile-recovery-live.spec.ts tests/e2e/profile-photo-live.spec.ts tests/e2e/auth-account-live.spec.ts --grep 'profile save|profile photo|real registration'` against the named disposable proof API and storage. Five integrated scenarios pass. Only the initial transport failure and response delay are injected; successful retries, persistence reads and storage bytes are real. Fixtures restore the account's names and initial avatar state.

CodeRabbit review was requested but could not run because the free CLI allowance was exhausted. Full desktop shell acceptance, other profile states and deployment remain open in #56. No backend or schema change is included.
