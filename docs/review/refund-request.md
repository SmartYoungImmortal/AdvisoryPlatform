# Review cancellation and refund requests

A paid booking now links to `/bookings/refund?bookingId=<owned booking UUID>`. The screen reads the exact invoice and the caller's existing cases, collects a reason, details and optional evidence, and shows the saved request status. A pending or failed invoice does not offer a refund request.

For an upcoming cancellable booking, submission confirms cancellation before opening the case. If cancellation cannot be confirmed, no case is opened. A lost case response triggers a read before a retry. Successful case creation and evidence uploads remain visible when a later upload fails. Ongoing/completed sessions can be disputed without changing their session state.

Case approval is distinct from a payment refund. The screen explicitly says that approval does not confirm returned money; invoice status remains authoritative. Payment-provider refunds remain with the payment owner.

## Local flow

Start the API at http://localhost:3200 and frontend at http://localhost:3001 with the disposable `advisory_proof` database in `advisory-booking-proof-db`, local Mailpit and private SeaweedFS. An advisee needs their own paid invoice linked to a booking. Open the booking, select **Refund request / status**, fill the reason/details, optionally attach evidence, then submit. Reload to verify the case, cancellation and files. An admin can inspect the attachment in `/admin/refunds/review?id=<case UUID>` and rule on the request; refresh the advisee page to see the decision.

The opt-in browser proof arranges synthetic paid fixtures only in that named local database and deletes them afterward; it never charges a card. Set `BOOKING_LIVE_PROOF=1` and `REFUND_EVIDENCE_CLEANUP_SCRIPT` to the API checkout's `test/refund-evidence-cleanup.cjs`. That helper requires explicit `REFUND_PROOF_DATABASE_URL`, `REFUND_PROOF_S3_ENDPOINT`, `REFUND_PROOF_S3_ACCESS_KEY`, `REFUND_PROOF_S3_SECRET_KEY` and `REFUND_PROOF_S3_BUCKET`, and refuses remote hosts or another database name. Run:

```sh
pnpm exec playwright test tests/e2e/refund-request-live.spec.ts
```

The two scenarios cover desktop 1440px approval and phone 390px rejection, persistence after refresh, byte-for-byte downloads, unsigned403, admin attachment review and the unchanged paid invoice. The desktop scenario also drives Swagger's evidence-list operation, proving200 for the owned case and404 for a missing one. Browser console errors are checked. Database cleanup still runs if object cleanup fails.

## Design and limits

References: [desktop cancellation/refund1952:32893](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1952-32893) and [phone1594:28448](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1594-28448). The form uses the existing component library and dynamic advisor/payment data. Mock OS chrome is omitted. The existing shared top navigation remains; exact whole-screen acceptance is not claimed. The unsupported three-business-day refund promise is replaced with review wording, and the displayed amount is the actual invoice amount, including all sessions that invoice paid for.

JPEG, PNG, WebP and PDF evidence is optional, at most five files per case and50MiB each. Identical retries reuse the stored file. Private links expire after five minutes; admin review refreshes links before expiry. The requester's files are available to their own session and admins with refund-read permission.

Validation: two real API/storage browser scenarios;88 frontend unit tests;11 ordinary browser tests; selected domain/API coverage96.36% statements/lines,98.19% branches,94.44% functions. This is not whole-UI coverage. CodeRabbit CLI review ran before PR creation; its cleanup-portability finding was fixed and the live proof rerun. Screenshots and recordings remain outside Git in the workspace audit folder. They are local-only because no connected browser is available for native GitHub attachments.
