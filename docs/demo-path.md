# Demo path: where each screen's data comes from

The end-to-end path the project demo walks, in order, with the API routes each screen reads and writes (paths are under `/api/v1` unless they start with `api/auth`). Checked against the code on 3 November 2026. "Fixture" means sample data in the frontend; every fixture still in the app is listed under [Excluded](#excluded-from-the-demo-path) with the reason.

No screen on this path reads or writes the mock store. Outside `lib/mock-db` itself, the only imports of it are its types, `avatars` and the `format` helpers. `lib/session` reads the signed-in account from `GET users/me`.

## Scope

In scope and API-backed:

- **Admin console** (`/admin/*`, `components/cms/screens/*`). Every screen calls `lib/api/admin.ts`. No admin screen uses a fixture. The old `lib/admin/*` fixtures are imported only by `components/admin/*`, and no route renders those.
- **Email change** (`/settings/email`, `/settings/email/verify`, `components/profile/email-screens.tsx`). It calls `requestEmailChange` in `lib/api/account.ts`, which is `POST api/auth/change-email`.

## Visitor and advisee

| # | Route | Data |
|---|---|---|
| 1 | `/search` | `GET services` with `q`, `categoryId`, `minPriceSatang`/`maxPriceSatang`, `minRating`, `availableOn`, `sort`, `page`, `limit`. The server filters, sorts and pages, and the pager reads `total`/`totalPages` (`useCatalogueSearch`, `lib/catalogue/live.ts`). The category chips come from the whole catalogue: `GET services?limit=100`, `GET advisors?limit=100`, `GET service-categories` and `GET advisors/reviews/summaries` (`useLiveCatalogue`). Session length has no API parameter. While that filter is on, every page of the rest of the search is read and the length is narrowed in the browser. |
| 2 | `/service/tax-freelance?serviceId=<uuid>` | `GET services/:id`, `GET advisors/:id`, `GET advisors/:id/reviews`, the rating summary, and `GET services/:id/slots` (`components/service/service-detail-live.tsx`, `service-booking.tsx`). Booking calls `POST bookings` and then goes to `/checkout/card?bookingId=`. A 409 opens a popup over the time picker and reads the times again. |
| 3 | `/advisors/sarah-jenskins?advisorId=<uuid>`, plus `/about` and `/reviews` | `GET advisors/:id`, `…/reviews/summary`, `…/reviews`, `…/background`, `…/portfolio` and `GET services?advisorId=` (`components/advisor-public/advisor-public-live.tsx`). The tab links keep `?advisorId=`. |
| 4 | `/checkout/card?bookingId=<uuid>` | `GET bookings/:id`, `GET services/:id`, `GET payment/public-key`, then an Omise.js token (`lib/payment/omise.ts`). Paying calls `POST payment/invoice/for-booking/:id` and `POST payment/checkout`, and the browser then navigates to the 3-D Secure URL. PromptPay calls `POST payment/promptpay` and polls `GET payment/invoice/:id/promptpay-status`. Mobile banking calls `POST payment/mobile-banking`. A coupon calls `POST payment/coupons/preview` (`components/payment/checkout-*.tsx`). Without `bookingId` the page shows a missing-booking notice. |
| 5 | `/checkout/success`, `/failed`, `/unconfirmed` with `?invoiceId=` | `GET payment/invoices/:id` (`components/payment/payment-result-screens.tsx`, `checkout-outcome.tsx`). `/failed` and `/unconfirmed` go back to the booking's checkout with the outcome as a popup when this tab left from it (`checkout-return.ts`); otherwise the popup stands on its own page. |
| 6 | `/bookings`, `/bookings/detail?bookingId=`, `/bookings/refund?bookingId=` | Reads: `GET bookings/me`, `GET services` and `GET advisors` (all pages, `lib/api/my-bookings.ts`), `GET bookings/:id`, `GET payment/invoices/for-booking/:id`. Writes: `POST bookings/:id/cancel`, `GET bookings/:id/reschedule-slots`, `POST bookings/:id/reschedule`, `POST refunds`. Refund evidence uses `refunds/:id/evidence` (list and upload) and `refunds/:id/evidence-url`. |
| 7 | `/chat`, `/chat/room?id=<roomId>` | `GET chat/rooms`, `…/messages`, `…/files`. Messages are sent and read over the Socket.IO events `chat:send` and `chat:read`, with `PATCH chat/rooms/:id/read` as the fallback. `PATCH chat/rooms/:id/mute`; `POST reports` (`components/chat/chat-data.ts`, `chat-live.ts`). |
| 8 | Meeting (from the booking sheet on `/bookings` and from `/work/session`) | `POST bookings/:id/meeting`, opened in a new tab (`components/bookings/use-booking-meeting.ts`). The state is worked out in the browser: before the room opens it shows "opens at", inside the window it shows join, and after the end it shows "ended". |
| 9 | `/reviews/session?booking=<uuid>` | `GET bookings/:id`, `GET bookings/:id/review` (a 404 means not reviewed yet), `POST bookings/:id/review` (`components/reviews/session-review-screen.tsx`). |
| — | `/transactions`, `/transactions/detail?id=` | `GET payment/invoices` and `GET payment/invoices/:id` (`components/payment/invoice-screens.tsx`). |
| — | `/notifications`, `/profile`, `/login`, `/register` | `GET notifications`, `…/unread-count`, `PATCH notifications/:id/read`, `PATCH notifications/read-all`; `GET users/me`, `GET users/me/avatar`; `POST api/auth/sign-in/email`, `POST api/auth/sign-up/email`. |

## Advisor

Every desk page also calls `GET advisors/me/screening-requests?status=PENDING&limit=1` for the badge (`lib/api/advisor-work.ts`).

| Route | Data |
|---|---|
| `/work`, `/work/calendar` | `GET users/me`, `GET advisors/me`, `GET advisors/me/bookings` (all pages, `lib/api/advisor-bookings.ts`). |
| `/work/session?id=<uuid>` | `GET advisors/me/bookings/:id`, `GET advisors/me/services/:id` and its `…/packages`, `GET advisors/me/screening-requests/:id`, `POST bookings/:id/meeting`. |
| `/advisor/services`, `/advisor/services/manage?serviceId=`, `/advisor/services/new` | `GET`/`POST`/`PATCH`/`DELETE advisors/me/services[/:id]`, `…/images`, `…/packages` and `…/packages/:id/image`; `GET advisors/me/availability/profiles`; `GET service-categories` (`lib/advisor-services/api.ts`). |
| `/availability`, `/availability/profiles`, `…/profiles/edit?id=`, `…/profiles/new` | `GET`/`PUT advisors/me/availability/global`; `GET`/`POST`/`PATCH`/`DELETE advisors/me/availability/profiles[/:id]` (`lib/availability/api.ts`). |
| `/screening/requests`, `/screening/review?requestId=` | `GET advisors/me/screening-requests[/:id]`, `POST …/:id/accept`, `POST …/:id/decline` (`components/screening/screening-data.ts`). |
| `/reviews` (the advisor's) | `GET advisors/me/reviews`, `PATCH advisors/me/reviews/:bookingId/reply` (`components/reviews/reviews-data.ts`). |
| `/earnings`, `/work/earnings`, `/earnings/payout-history` | `GET advisors/me/payouts`. |
| `/earnings/payout-account` | `GET`/`PUT`/`DELETE advisors/me/payout-account`. |

## Admin console

| Route | Data (`lib/api/admin.ts`) |
|---|---|
| `/admin/login` | `POST api/auth/sign-in/email` and `GET users/me`. An account that is not an admin is signed out again. |
| `/admin/dashboard` | Counts read from the list routes below. |
| `/admin/users`, `/admin/users/edit` | `GET admin/accounts[/:id]`, `POST …/:id/suspend`, `POST …/:id/reinstate`. |
| `/admin/services`, `/admin/services/edit` | `GET admin/services`, `GET service-categories`. Read-only: the API has no admin service mutation. |
| `/admin/verification`, `…/review`, `…/proof` | `admin/identity-verifications[/:id]` (`approve`, `reject`, `document-url`) and `admin/skill-proofs` (approve, reject, document URL). |
| `/admin/refunds`, `…/review` | `admin/refunds[/:id]` (`context`, `approve`, `reject`, `evidence-url`). |
| `/admin/reports`, `…/review`, `…/flag` | `admin/reports[/:id]` and `admin/off-platform-flags[/:id]` (`context`, `resolve`). |
| `/admin/payouts` | `admin/payouts[/:id]` (`mark-paid`, `mark-failed`). |
| `/admin/manage`, `…/edit`, `…/skill` | `GET`/`POST`/`PATCH`/`DELETE service-categories[/:id]` and `skills[/:id]`. |

## Excluded from the demo path

These still render fixtures. Apart from the gap noted on the advisor profile row, none can be reached from the path above by following its links. The routes are kept because their designs are the approved frames that `/screens` links to.

| Where | Fixture | Why it is excluded |
|---|---|---|
| `/service/<slug>` without `?serviceId=` (`components/service/service-detail-screen.tsx`, `FixtureServiceDetail`) | `lib/catalogue/services.ts` | Prerendered slugs. Only `/screens` and other fixture pages link here; every live link uses `liveServiceHref`. |
| `/advisors/<slug>` without `?advisorId=` (`components/advisor-public/advisor-public-profile-screen.tsx`, `FixtureProfile`) | `lib/catalogue/profiles.ts` | Prerendered slugs. Only `/screens` and fixture pages link here; every live link uses `liveAdvisorHref`. One gap: before hydration the page cannot see the query, so the pending profile's tab links have no `?advisorId=`, and a click in that moment opens the fixture. |
| `/availability/configured`, `/availability/custom` (`components/availability/global-availability-screen.tsx`) | `GLOBAL_AVAILABILITY` in `lib/availability` | Design-state routes. When signed in, all three routes, `/availability` included, draw the live `GET advisors/me/availability/global`. The fixture figures are never drawn: the screen shows its skeleton while loading and `ApiErrorCard` on a failure. |
| `/checkout/card/saved` (`components/payment/card-details-screen.tsx`, `SAVED_CARD`) | One sample card | The API has no saved-cards route; `payment.controller.ts` has no `cards`. It needs `GET`/`POST`/`DELETE` on the reader's cards first. |
| `/checkout/failed`, `/unconfirmed` without `?invoiceId=`; `/transactions/detail/failed`, `/refunded` without `?id=` | Sample receipt copy | Design states. Live links always carry the invoice id. |
| `/transactions` | `sampleHistory` | Only when the build has no API URL. |
| `/notifications/advisor` | Sample notifications | Design state. The live list is `/notifications`, which reads `GET notifications` for whoever is signed in. |
| `/advisor/services/<slug>/edit` | Slug ids from `lib/advisor-services` | Prerendered slugs, linked only from `/screens`. The live editor is `/advisor/services/manage?serviceId=`. |

## Not covered here

The workload checklist on the shared Drive is kept outside this repository. Its split between "UI done" and "API-integrated" has to be updated there, from the tables above.
