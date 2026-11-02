# Review profile photo upload and recovery

The profile editor's existing photo flow is now verified through the real browser, API and private storage at phone and desktop widths. This follow-up adds repeatable verification and updates stale selectors in the broader account flow; it makes no production UI or API changes.

Open [local profile editing](http://localhost:3001/profile/edit) as a signed-in advisee after starting the disposable API on port 3200 and frontend on port 3001. Start the frontend with `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev --port 3001`. These are local services, not a deployed preview.

1. Choose a text file through Change Photo. The editor rejects the format before making an upload request.
2. Choose a PNG larger than 5 MB. The editor explains the size limit before upload.
3. Abort the avatar POST in browser developer tools and choose a valid PNG. The upload error appears and Change Photo remains available.
4. Remove the fault and select the same PNG again. While uploading, Save and photo controls stay disabled. The image appears after success and remains after reload.

Run `AUTH_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/profile-photo-live.spec.ts` against the named disposable proof API and storage. The scenarios require the seeded proof account to have no avatar and refuse to overwrite an existing one. They upload the repository's existing application icon as a recognizable test image, compare the downloaded private image bytes with that file, then delete the fixture avatar and confirm the account is back to its initial state.

Only the first transport failure is injected. The successful retry reaches the real API and storage; its response is held briefly to inspect pending controls. No successful API response is fabricated. The tests capture phone/desktop screenshots and video under ignored `test-results/`.

The broader account scenario also passes after updating its Save selector and phone input selector for the responsive layout. It exercises registration, delivered verification email, login, desktop profile saving, phone reload, password change, reset and account deletion. Run `AUTH_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/auth-account-live.spec.ts --grep 'real registration'`.

The [final phone editor frame](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=995-7586) remains the layout reference. This verification does not establish additional visual acceptance: the uploaded application icon is test data, the photo error text describes the actual failure, and existing desktop differences remain. Desktop visual acceptance, other authentication states and deployment remain open in #56.
