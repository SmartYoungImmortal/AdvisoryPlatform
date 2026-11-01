# Review a rescheduled booking

An advisee can move a booking using its stored duration, even after the advisor edits the package. The picker uses booking-specific slots, so an appointment that will release its time does not consume the replacement's daily capacity. A taken slot refreshes the choices and clears the selection. Success opens the replacement booking rather than the cancelled original.

## Try it locally

Use the local API on port 3200 and frontend on port 3001. There is no deployed preview. From the frontend checkout, start `NEXT_PUBLIC_API_URL=http://localhost:3200 pnpm dev --port 3001` after starting the disposable API and its database and storage.

1. Sign in as an advisee with an upcoming booking and open [My bookings](http://localhost:3001/bookings). Open that booking, then choose **เปลี่ยนเวลานัด**.
2. Choose a time and confirm. The URL changes to the replacement's ID. Reload and check the saved time and duration.
3. In another signed-in session, book the selected slot before confirming. The first browser shows the API error, removes the unavailable choice and requires a new selection.

The API change must be available before the frontend change.

## Repeat the proof

Use only the disposable `advisory-booking-proof-db` container and `advisory_proof` database, the API on port 3200, private SeaweedFS and the seeded demo accounts. The test temporarily changes the demo advisor's policy, creates its own service and profile, then removes its appointments and restores the policy. Do not run it against a shared environment.

```sh
BOOKING_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/booking-reschedule-live.spec.ts
```

Four real desktop and phone scenarios check an edited package's stored one-hour duration, a full daily limit, a competing booking, cleared selection, replacement-ID navigation and persistence after reload. They use real HTTP responses, without mocked slots. Desktop also executes the new operation in [Swagger](http://localhost:3200/api/v1/docs) with the advisee's cookie for 200 and without a session for 401. API HTTP tests cover another user's 404, invalid input, terminal bookings and late-cancellation capacity.

## Acceptance limits

Behavior is proven locally. Full visual acceptance remains incomplete. The surrounding pending-payment detail uses the existing summary card; the [phone detail reference](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1594-27904) and [desktop detail reference](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1952-32355) show a different confirmed-booking layout. The comparison in the PR labels this state difference. No approved rescheduling-picker frame was available, so its styling is retained without a fidelity claim.

The browser proof uses unpaid bookings. It does not prove invoice transfer, provider payment or receipts for paid rescheduling. The existing screen can fall back to the current service price when an invoice is unavailable, which can differ from a package's price. Paid state and chat preservation have API tests, but that does not establish the payment lifecycle. A lost successful POST response still needs separate reconciliation work. This change does not close the entire booking issue or the workload's visual and coverage acceptance.
