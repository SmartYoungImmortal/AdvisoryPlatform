# Complete profile booking history

Profiles previously read only the oldest 100 appointments. Accounts with longer
histories could lose their upcoming appointments and show incorrect completed
session and consultation-hour totals. The profile now uses the same paginated
booking and advisor readers as My Bookings, with shared cache keys.

## Local review

Start the disposable API on port 3200 and the frontend with
`NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev --port 3001`.
Open [Profile](http://localhost:3001/profile) as a verified advisee with more than
100 appointments. Check completed-session totals and upcoming appointments,
reload, and follow the upcoming row to My Bookings.

Run `BOOKING_LIVE_PROOF=1 pnpm exec playwright test booking-details-live.spec.ts
--grep 'profile counts'` against the seeded local proof database. The scenario
inserts 101 completed appointments and one upcoming appointment, uses the real
sign-in and booking APIs, checks the completed total against persisted rows,
checks desktop and phone rendering, reloads, follows the booking list, and removes
its appointments afterward. No API responses are intercepted.

This fixes data loading; it does not establish final Figma acceptance. The
current profile styling and the shared catalogue's pagination remain separate
limitations. Screenshots and video stay outside Git in the local audit folder;
they are not GitHub-hosted attachments or deployment evidence.
