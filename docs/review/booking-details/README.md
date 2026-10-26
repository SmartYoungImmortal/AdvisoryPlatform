# Review booking details

My Bookings now opens the selected appointment's details. The page reads the real booking, advisor and service, shows the booked time and duration, and supports cancellation. Returning to My Bookings shows the cancelled appointment without a manual refresh. The next-session action is labelled “Open chat” because it opens chat, not a video call.

## Try the flow

[Open My Bookings locally](http://localhost:3001/bookings). This URL requires the local frontend on port 3001 and API on port 3200. It is not a hosted preview and is not reachable from another computer.

For the disposable seeded database used in this review, sign in as `nattapong.d@advisory.demo` with the seed's public demo password, `AdvisoryDemo!2026`. These credentials apply only to that demo environment.

1. Open My Bookings and select Details on an upcoming appointment.
2. Check the advisor, service, appointment date, time and duration.
3. Resize to a phone width. The page should remain usable without horizontal scrolling.
4. Select Cancel booking. The cancellation action should disappear after the API accepts it.
5. Return to My Bookings and select Cancelled. The appointment should appear there.
6. Reload. The cancellation should persist.

The live test performs these actions and verifies that a different advisee cannot retrieve the booking. Run it against a fresh, isolated API seeded with `src/database/seed.ts` in the sibling API repository:

```sh
BOOKING_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/booking-details-live.spec.ts
```

The test uses real requests and consumes one seeded BOOKED appointment. Do not run it against the shared database. The standard test command skips this opt-in test when the isolated API is unavailable.

## Watch the evidence

- [Browser recording](https://github.com/user-attachments/assets/4ff8c353-f2ed-4137-8aa8-dc5287039f80), slowed three times for readability: real sign-in, booking details at desktop and phone widths, cancellation and persisted state.
- [Swagger recording](https://github.com/user-attachments/assets/850935b5-6170-4fd2-b9a5-799750cf70d3): participant-authorized booking details.
- [Desktop screenshot](https://github.com/user-attachments/assets/2eae3c05-75fc-4a8a-bf84-8eae9f6690d1).
- [Phone screenshot](https://github.com/user-attachments/assets/4ab62ad1-4be8-436a-a821-8e629d558ad2).

[Open local Swagger](http://localhost:3200/api/v1/docs). After signing in through the frontend in the same browser, expand `GET /api/v1/bookings/{bookingId}`, select Try it out, and enter an appointment ID from My Bookings. The owner receives 200. Another advisee receives 404 for that appointment. No API code or authorization rule changes are part of this PR.

## Compare with Figma

- [Main: My bookings](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b/Advisory-Platform?node-id=1594-28110).
- [Main: Booking detail](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b/Advisory-Platform?node-id=1594-27904).

The detail page uses the current application frame and existing components. It is a partial implementation of the Figma detail flow. Payment breakdown, payment method, consultation goal, calendar export, countdown and video joining are not delivered here. The API has no participant invoice lookup or consultation-goal field, and meeting behavior remains a separate dependency. No example payment information is displayed as real data. Public advisor/service records that cannot be retrieved display an unavailable message; the appointment's own time and state remain visible.

## Validation and remaining work

The production frontend build, TypeScript check, focused ESLint, 11 unit tests, and 11 existing browser tests passed. The separate live test passed against disposable Postgres and the actual API, including reload persistence, list refresh and denied cross-user access. Existing browser tests use intercepted API responses; the live test does not. This does not prove deployment behavior or full-scope frontend coverage.

Repository lint still reports 14 existing design-token violations in service and availability files. Booking refund requests remain unresolved, so this change does not close issue #59.
