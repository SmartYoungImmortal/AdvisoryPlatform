# Review cancellation and refund requests

Every way out of a booking comes from one rule, `bookingExit` in `components/bookings/booking-exit.ts`, built from /terms §8 (`lib/legal/terms.ts`, id `cancellation`). The booking popup, `/bookings/detail` and `/bookings/refund?bookingId=<owned booking UUID>` all read it, so a booking shows at most one way out and one line about its money:

- Unpaid and before the start: the plain cancel in the popup, nothing about money.
- Paid, booked, 24 hours or more before the start: cancel and get the whole charge back.
- Paid, booked, inside 24 hours: cancel and get 50% of the service fee back; the platform fee is kept.
- From the start (or once in progress) until 7 days after the end: no cancel; report a problem and request a refund. Sending never changes the booking.
- After that: the refund window is closed.
- Cancelled and paid with no request: claim the refund owed with one press (the whole charge when the advisor or the team cancelled).
- A request on record: its status only, never a second request. A cancellation reads "กำลังคืนเงิน"; only a reported problem is reviewed, by the team, within 14 business days.

Cancel-and-refund cancels first and checks it, then opens the request. A lost response is read back before any second POST. If the cancel stood and the request did not, the page lands on the claim with an alert, so the money is never stranded. Nothing is offered while the invoice or the requests are still loading.

Case approval is distinct from a payment refund: approving a case only changes its status and moves no money yet. The card refund through the payment provider is API #86, which also has to refund part of a charge before the 50% shown here can be paid back as shown. Until then an approved request reads "อนุมัติแล้ว กำลังคืนเงิน" and only an invoice the API marks refunded reads "คืนเงินแล้ว". The page never promises a date the money arrives; invoice status remains authoritative.

## Local flow

Start the API at http://localhost:3200 and frontend at http://localhost:3001 with the disposable `advisory_proof` database in `advisory-booking-proof-db`, local Mailpit and private SeaweedFS. An advisee needs their own paid invoice linked to a booking. Open the booking and use its one way out (**ยกเลิกและรับเงินคืน** before the start, **ขอคืนเงิน** after it); for a report pick what happened, optionally add details and evidence, then send. Reload to verify the case, cancellation and files. An admin can inspect the attachment in `/admin/refunds/review?id=<case UUID>` and rule on the request; refresh the advisee page to see the decision.

The opt-in browser proof arranges synthetic paid fixtures only in that named local database and deletes them afterward; it never charges a card. Set `BOOKING_LIVE_PROOF=1` and `REFUND_EVIDENCE_CLEANUP_SCRIPT` to the API checkout's `test/refund-evidence-cleanup.cjs`. That helper requires explicit `REFUND_PROOF_DATABASE_URL`, `REFUND_PROOF_S3_ENDPOINT`, `REFUND_PROOF_S3_ACCESS_KEY`, `REFUND_PROOF_S3_SECRET_KEY` and `REFUND_PROOF_S3_BUCKET`, and refuses remote hosts or another database name. Run:

```sh
pnpm exec playwright test tests/e2e/refund-request-live.spec.ts
```

The two scenarios cover desktop 1440px approval and phone 390px rejection, persistence after refresh, byte-for-byte downloads, unsigned403, admin attachment review and the unchanged paid invoice. The desktop scenario also drives Swagger's evidence-list operation, proving200 for the owned case and404 for a missing one. Browser console errors are checked. Database cleanup still runs if object cleanup fails.

## Design and limits

The page is laid out as the receipt of the refund: inside the account frame at the bookings section's width, one card with the status line, the amount in large type and the facts on the left and the conditions, the report form or the progress on the right, the one main button under it, and a way back to the booking instead of a breadcrumb. The report reasons are the grounds §8 names. The mocked browser proof is `tests/e2e/refund-flow.spec.ts` at 1440 and 390.

JPEG, PNG, WebP and PDF evidence is optional, at most five files per case and 50 MB each. Identical retries reuse the stored file. Private links expire after five minutes; admin review refreshes links before expiry. The requester's files are available to their own session and admins with refund-read permission.

Validation: two real API/storage browser scenarios;88 frontend unit tests;11 ordinary browser tests; selected domain/API coverage96.36% statements/lines,98.19% branches,94.44% functions. This is not whole-UI coverage. CodeRabbit CLI review ran before PR creation; its cleanup-portability finding was fixed and the live proof rerun. Screenshots and recordings remain outside Git in the workspace audit folder. They are local-only because no connected browser is available for native GitHub attachments.
