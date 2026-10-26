# Review cancellation reliability

Cancellation now checks the booking after an ambiguous or conflicting response instead of immediately offering another cancellation. If the API cannot confirm the state, Cancel stays disabled and Check status only reads the booking. A confirmed cancelled booking, a booking that has already started, and an expired session each receive different feedback. My Bookings and Details use the same behavior.

## Review the recordings

[PR #84](https://github.com/SmartYoungImmortal/AdvisoryPlatform/pull/84) contains seven labelled edge-case videos and one Swagger video as native GitHub attachments. Media is stored outside Git. Frontend recordings are slowed twice for readability.

| Scenario | What the recording proves |
| --- | --- |
| Offline details | Cancel stays disabled after the network fails. After reconnecting, Check status reads the real booking and enables retry only when it is still active. |
| Lost response | The real API commits cancellation, then the test drops its response. The UI reads the cancelled state without sending a second cancellation. |
| Two tabs | One tab cancels first. The stale tab receives a real 409 and displays the authoritative cancelled state. |
| Expired/missing session | The test removes the session cookie. The real API returns 401; the UI offers sign-in without claiming cancellation. |
| Double-click | The test delays a real response. Cancel stays disabled and two clicks send one POST. |
| Session already started | The advisor starts the consultation through the API. The stale cancellation receives 409 and the UI refreshes to the new state. |
| Offline phone list | The mobile My Bookings screen also requires a status check before another cancellation attempt. |
| Swagger | First cancellation returns 200, repeating it returns 409, and requesting it without a session returns 401. |

Offline mode, response loss and response delay are deliberate browser transport faults. Requests otherwise reach the actual API and disposable Postgres. No successful or failed API response body is fabricated in these recordings. Fixture reset happens only inside the named disposable Docker database before each scenario.

## Try it locally

[My Bookings](http://localhost:3001/bookings) and [Swagger](http://localhost:3200/api/v1/docs) require local services; they are not remote preview links. Use the isolated demo environment and the seeded `nattapong.d@advisory.demo` account with the seed's public demo password, `AdvisoryDemo!2026`.

1. Open an upcoming booking's Details.
2. Disconnect the browser network and select Cancel booking.
3. Confirm that the uncertainty message and Check status action appear, while Cancel remains disabled.
4. Restore the connection and select Check status. If the booking is still active, retry becomes available.
5. For the two-tab scenario, open the same booking in two tabs, cancel in one, then attempt cancellation in the stale tab. Both should converge on the cancelled state.

The existing [Main booking detail](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b/Advisory-Platform?node-id=1594-27904) and [My bookings](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b/Advisory-Platform?node-id=1594-28110) frames remain the visual references. Recovery messages are functional additions using the existing components and tokens; this change introduces no new design frame.

## Repeat the verification

With the API on localhost:3200 backed by the isolated, seeded `advisory-booking-proof-db` Docker container, run:

```sh
BOOKING_EDGE_PROOF=1 pnpm exec playwright test tests/e2e/booking-cancellation-edge-live.spec.ts
```

The opt-in tests reset one future demo appointment in that container and exercise the API. They must not target the shared database. The normal test command skips these tests because CI has no proof API/database. Unit tests cover the cancellation outcomes and immediate duplicate-submission suppression. A previously failing live offline test passed after this change.

Production build, TypeScript, focused ESLint, 42 unit tests and 11 existing browser tests passed. Seven separate live edge-case tests passed. The configured unit coverage scope now includes the new cancellation module, but remains narrower than the full Taj workload required by #60. Existing browser tests use intercepted APIs; the opt-in recordings use the real API with the transport faults described above.

This does not prove every possible booking edge case or deployment behavior. Refunds, payment, video joining and the other remaining #59 requirements are unchanged. Repository-wide lint still has the previously reported 14 design-token findings in service and availability files. No backend authorization or lifecycle rules change in this PR.
