# Login pauses and account deletion

Five failed email/password attempts within 15 minutes pause sign-in for 15 minutes. The API
owns the counter across clients. Editing the password keeps the button disabled until the
reported delay expires; changing to another email allows that account to sign in. Reset-password
requests remain available. The pause does not reveal whether the email is registered.

An account with unsettled advisor earnings cannot be deleted. The dialog explains the blocker
without quoting a fabricated balance. A paid payout clears the invoice blocker; pending or failed
payouts do not. The API rechecks this when deleting, alongside upcoming appointments.

Local starting URLs: <http://localhost:3001/login> and <http://localhost:3001/settings>.
These require the local frontend, API on port 3200, and disposable proof services. No public preview
or production deployment was verified. Use disposable accounts only for deletion.

Run `AUTH_LIVE_PROOF=1 pnpm exec playwright test tests/e2e/account-guards-live.spec.ts` with the
named `advisory-booking-proof-db` container/database `advisory_proof`. Four real browser scenarios
cover desktop and phone lock/recovery and unpaid-to-settled deletion. Expiry is advanced only in
the disposable auth record; financial rows are synthetic, with no provider charge or transfer.
The desktop scenario also runs the authenticated deletion-blocker GET in Swagger.

The booking-selection and onboarding-storage proofs now follow the current picker dialog and
combined verification routes. Their three real browser scenarios pass.

Figma references:

- [Phone login lock](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1962-32037)
- [Desktop login lock](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1787-23805)
- [Phone deletion blocker](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=995-7499)
- [Desktop deletion blocker](https://www.figma.com/design/pddSCcCJ1hmYHAZO1GW13b?node-id=1787-25766)

Behavior: passed locally. Figma verdict: differences remain. The existing two-step login differs
from the single-form reference in logo, placement, field arrangement and button treatment. The
existing settings modal differs from the full-page deletion reference in shell, icon, spacing and
border treatment. This change connects the lock and earnings states; it does not claim whole-screen
design acceptance. The earnings copy omits the design's sample balance because the API reports a
blocker, not a withdrawable amount.

Screenshots, videos, Swagger evidence, and labelled side-by-side comparisons are saved outside
Git at the workspace's `.audit/account-guards-proof/`. They are local evidence, not GitHub-hosted
attachments; no connected browser surface was available for native media upload.
