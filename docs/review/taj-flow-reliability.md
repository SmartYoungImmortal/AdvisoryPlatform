# Review Taj’s local user flows

These fixes connect the existing screens to their real API behavior. They do not complete every Figma state or the payment and video dependencies.

## What changed

- A rejected booking selection clears its stale time and refreshes available slots.
- Service edits retain saved daily limits. Limit controls change and save real values, use the advisor's current policy, and stop at the displayed bounds.
- Availability presets, day switches, custom settings and phone save actions work. Reloading a newly saved profile keeps its ID and specific-date windows. Offline saves retain edits for retry; linked profiles cannot be deleted.
- Password changes revoke other sessions. The success message reflects the API's existing five-minute session-cache policy. Email confirmation returns to the frontend and describes both mailbox confirmations.
- Login return paths reject backslashes and control characters that browsers can interpret as external navigation.
- Admin identity and skill reviewers request fresh permission-checked document URLs, refresh them before expiry, and display loading, unavailable and retry states. Storage keys are not exposed.
- Service and availability controls use the existing primitives; the token guard is clean.

## Run the real proof

Use an isolated, seeded `advisory_proof` Postgres database in the named `advisory-booking-proof-db` container, an API on port 3200, Mailpit on ports 1025/8025, and private SeaweedFS on port 8333. Never point these fixtures at shared data. The tests create, change and delete local proof fixtures.

Start the frontend on port 3001 with `NEXT_PUBLIC_API_URL=http://localhost:3200`. The test config can start it automatically.

```bash
AUTH_LIVE_PROOF=1 BOOKING_LIVE_PROOF=1 AVAILABILITY_LIVE_PROOF=1 STORAGE_UI_LIVE_PROOF=1 \
  pnpm exec playwright test \
  tests/e2e/auth-account-live.spec.ts \
  tests/e2e/availability-live.spec.ts \
  tests/e2e/booking-selection-live.spec.ts \
  tests/e2e/chat-storage-live.spec.ts \
  tests/e2e/onboarding-storage-live.spec.ts \
  tests/e2e/service-limit-live.spec.ts
```

The 15 scenarios use real HTTP responses. The offline availability scenario deliberately disconnects the browser; the stale-slot scenario makes a real competing booking. Fixtures restore advisor settings and remove their temporary records. The booking fixture discovers the seeded service rather than relying on one database's UUID.

For ordinary checks, run `pnpm test:unit:coverage`, `pnpm test:e2e`, `pnpm lint`, and `pnpm exec tsc --noEmit`. Live scenarios are opt-in and skip in ordinary CI.

## Review visually

Local starting points: [service management](http://localhost:3001/advisor/services), [availability](http://localhost:3001/availability), [account settings](http://localhost:3001/settings), and [Swagger](http://localhost:3200/api/v1/docs). These links require local services; no remote preview is supplied.

Screenshots and recordings are attached to the pull request outside Git. Each attachment identifies the action, expected result, observed result and separate Figma verdict. Real local success does not establish deployed behavior.

The final design file is [Advisory Platform](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b/Advisory-Platform). Exact comparison remains pending because the connector is unavailable and the browser requires sign-in. Reference desktop frames include [service edit](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b/Advisory-Platform?node-id=1998-29262), [global availability](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b/Advisory-Platform?node-id=1994-27872), and [profile editor](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b/Advisory-Platform?node-id=1994-29171). No visual-match claim is made.

## Coverage and remaining scope

Configured frontend coverage measures selected domain and API modules. It excludes the other owners' onboarding component and does not establish 80% coverage of all Taj-owned UI source. The browser proof covers the real consumers separately.

Invoice history and receipt endpoints are now merged into the API. Refund-request status and the exact appointment-to-invoice association still need acceptance; receipt rows do not expose a booking UUID. Timed login lockout, authoritative balance-based account deletion, default-profile semantics, complete Figma acceptance and deployment verification remain unresolved. Do not close all workload issues from this change.


## Exact receipt lookup for bookings

The booking sheet now reads `GET /payment/invoices/for-booking/:bookingId`. The API resolves the stored appointment/invoice relation and verifies the booking belongs to the signed-in advisee. This replaces service/time matching against the first 50 invoices. Both sessions on a shared invoice open the same receipt, even when the selected session is not the earliest. Existing receipt layout and invoice session summary remain unchanged. Deploy the API change before the frontend.

Local proof: the new opt-in `booking-invoice-live.spec.ts` follows both booking links into the receipt at 1440px and 390px, with no intercepted network requests. A disposable pending invoice and two appointments are inserted and removed from the named local proof database. A different advisee receives 404 and malformed UUID receives 400. Six repository integration tests, 52 focused payment unit tests, and 88 frontend unit tests pass. Exact Figma comparison remains blocked by sign-in; this is a data-link fix, not visual acceptance. Current screenshots and recording remain outside Git in the workspace audit folder; they are not yet attached to GitHub. Refund request/status UI remains unfinished.


## Service images before publishing

Drafts may have no image. Publishing requires at least one stored service image; the API rejects direct published creation and image-free publish updates with400. The create form saves a draft, uploads selected files, then publishes. It retains the draft id and successful uploads on failure so retrying in the same form does not create another draft. Existing published services are not automatically hidden.

The existing image area now selects and previews JPEG, PNG and WebP files, up to5MiB each and6images per service. Owned image URLs reload from storage. Uploads validate ownership, type/signature and size. A row lock keeps concurrent uploads within the gallery limit. Failed database attachment removes the new object, and service deletion removes its stored images. API routes: GET/POST `/advisors/me/services/:serviceId/images`. Deploy the API before the frontend.

Local review: start at http://localhost:3001/advisor/services/new with an approved advisor and availability profile. Save without an image as a draft; publishing without an image must show the image-required message. Select an image and publish; reload the edit page and check the thumbnail. Six real-API browser scenarios passed across1440px and390px, including draft/publish/hide/delete, limit preservation and create/upload/publish. Both backend service lifecycle HTTP scenarios passed with real Postgres and stubbed storage; the browser proof uses real SeaweedFS. API unit suite674passed before adding two further focused storage-failure tests; all29advisor-service unit tests pass afterward. Frontend88unit tests, TypeScript, targeted lint and production builds pass.

Screenshots and videos are outside Git in `.audit/service-image-2026-10-28`. New GitHub attachment upload is blocked because no browser surface is connected and this gh build has no attachment option. Existing PR media remains; these new media files are local only. Current mobile and desktop renders were inspected. Exact Figma comparison remains unavailable pending sign-in; the existing image-area styling was retained.


## 29 October: Figma access restored, image strip corrected

The connected Phak account can now read the final Figma file. Compared the service image area with [desktop edit1998:29262](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1998-29262), [phone edit1594:29680](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1594-29680), and phone empty-create1594:30215. The populated picker now uses88px-high thumbnails with a compact add tile,83px-wide tiles on desktop and four columns on phone. The large empty-state dropzone remains only while no image is selected. Actual uploaded images stay dynamic. The added publishing-policy hint reflects the user-approved rule.

Six real API/storage service scenarios passed at1440px and390px; the final fill-image adjustment was followed by another two create/upload/publish passes. TypeScript and targeted ESLint pass. Fresh desktop/phone screenshots were inspected and remain outside Git in `.audit/service-image-layout-2026-10-29`. Whole-screen Figma acceptance is still incomplete: existing navigation, desktop page gutters, and the duration-versus-maximum-booking-slot contract differ from this reference. Those are pre-existing findings, not changed by this image-area correction. Exact Figma access is no longer a blocker.
