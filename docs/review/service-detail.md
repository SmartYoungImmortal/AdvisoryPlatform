# Review your service and its schedule

The service list now opens the full advisor detail screen with the owner's saved service, uploaded image, availability profile, rules and complete booking history. Booking rows open the exact session. The schedule reads real free slots and saved date-specific rules. Its month and day controls work in the advisor's timezone.

## Try the flow

Use the local frontend on port 3001 and API on port 3200, with a signed-in approved advisor. These links require local services; there is no deployed preview.

From the frontend checkout, start the local frontend after the disposable API is running:

```sh
NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev --port 3001
```

1. Open [My services](http://localhost:3001/advisor/services) and select a service.
2. Check its name, price, duration, publication state, linked availability profile and bookings. Open a booking to see that session's participant and service.
3. Follow **Edit availability profile**, change its name, save, and return. The detail screen shows the saved name without a full reload.
4. Follow **View schedule**. Move between months and choose a day. Check the free slots against the advisor's timezone, bookings and date-specific rules.
5. Open a hidden service. Saved rules remain visible, with an explanation that free slots require publication.

A screened service's owner can inspect its slots without screening themselves. Other users still need accepted screening. The API change must deploy before this frontend.

## Repeat the local proof

Use the named disposable `advisory-booking-proof-db` container and `advisory_proof` database, the API on port 3200, and private SeaweedFS. The proof creates and removes its service, image, profile and appointment. Do not use a shared database.

```sh
BOOKING_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/service-detail-live.spec.ts
```

The desktop and phone scenarios use real API and storage responses. They check the list-to-detail link, profile save and return, exact session link, free-slot times and counts, blocked date, month navigation, reload, advisee denial, screening denial and retry. Only the connection-failure scene deliberately aborts requests; it removes that fault before the successful real retry. The desktop run also executes the authenticated slots operation in [Swagger](http://localhost:3200/api/v1/docs).

Screenshots and recordings belong in the PR, outside Git. The tests also leave local screenshots under ignored `test-results/`.

## Design and completion limits

Behavior is verified locally, not on a deployment. Whole-screen Figma acceptance remains open. The existing shared navigation, page gutters and separate statistic tiles differ from the final design. Live service images and names replace Figma's sample content. No participant portrait, rating or review count is invented when the owner API does not supply it.

Reference frames: [desktop detail](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1998-28898), [desktop detail rail](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1998-28963), [desktop schedule](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1998-29072), and [phone schedule](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1594-33136). The saved rail reference was inspected; fresh full-frame reads timed out.

The API does not supply total opened-slot statistics or a reason for every unavailable candidate. Those counts display an unavailable state, and the schedule distinguishes saved rules from returned free slots. Hidden services have no preview-slot contract. The detail's next-slot search spans up to 90 inclusive days; the full calendar can inspect later months within the saved booking horizon.

This change does not close the full service, availability or 80% UI coverage issues. The earlier coverage baseline has not been remeasured for this change.
