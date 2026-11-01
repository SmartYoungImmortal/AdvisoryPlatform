# Coverage of Taj’s UI source

The unit coverage configuration measures selected helpers and API adapters. Its percentage does not represent all Taj-owned screens. The browser coverage command measures the owned client source separately and fails below 80% in any of statements, branches, functions or lines.

The scope is defined before measurement in `scripts/taj-owned-sources.mjs`, from [the shared workload workbook](https://drive.google.com/file/d/1W3V-NP37qe2dh-Nrz7OZBpXYGGuOwkDZ/view), read on 1 November 2026:

| Workload group | Included source |
|---|---|
| Authentication and roles — 25 screen states | Auth, own-profile/account, legal screens, session and access logic |
| Services — 9 states | Advisor service management and advisor session details |
| Availability — 17 states | Availability/profile editors and advisor calendar |
| Booking — 14 states | Slot picker, booking list/detail, cancellation/refund UI and domain logic |
| Storage — 0 standalone screens | Exercised through the actual consuming UI; other owners’ chat/onboarding components excluded |

Shared application shells/UI primitives, generic resource clients containing other owners’ endpoints, discovery/catalogue, advisor onboarding/profile/earnings, screening/trial management, payments, chat and reviews are outside this ownership measurement. Thin server route wrappers are not browser code. These exclusions are ownership boundaries, not choices based on coverage results. This does not claim coverage of every shared dependency used by a Taj screen.

## Run

Ordinary frontend checks retain their existing commands and do not collect browser coverage. For the owned-UI report:

```sh
pnpm test:ui:coverage
```

The command starts the configured local frontend, records Chromium execution counts, writes ignored generated files under `ui-coverage/raw`, and produces `ui-coverage/report/index.html`, `coverage-final.json`, `coverage-summary.json` and `scope.json`. It returns a failure if a browser test fails or any coverage metric is below 80%. Unvisited owned files remain in the denominator with zero execution counts. Before the first measured scenario, a source-only warmup requests the real routes and their Next-compiled JavaScript/maps without executing that JavaScript. Every warmup count is zero; it establishes the same compiler output for visited and unvisited files. A file missing from those maps fails the report instead of being silently omitted or compiled with another tool. A failed or empty capture cannot produce a successful report.

Live tests still require the named disposable proof API/database, Mailpit and SeaweedFS. Enable the existing proof flags for the flows you have prepared: `AUTH_LIVE_PROOF`, `AVAILABILITY_LIVE_PROOF`, `STORAGE_UI_LIVE_PROOF`, `BOOKING_LIVE_PROOF`, and `BOOKING_EDGE_PROOF`, set to `1`. Refund proof additionally requires its existing `REFUND_EVIDENCE_CLEANUP_SCRIPT` hook. Never run these fixtures against shared data. Without these services/flags, live scenarios skip and the coverage gate is expected to reveal the missing execution rather than pretend ordinary mocks establish full UI coverage.

Existing captures can be reported with `UI_COVERAGE_DIR=<capture directory> pnpm test:ui:coverage:report`. A new full run clears only the command’s fixed generated capture directory.

## What the measurement proves

The fixture reads Chromium’s real execution counts and the Next development server’s source maps. Maps are flattened and execution counts are merged before conversion to Istanbul locations in the original TypeScript/TSX files. Generated framework code is excluded by the fixed ownership manifest. Explicit `page.goto` and `page.reload` calls flush coverage before Chromium discards the old document. Application-triggered hard navigation can discard unflushed counts, so this is a conservative lower bound rather than a claim to observe every executed instruction. The primary test page is recorded; secondary Swagger pages, external meeting tabs and other owners’ browser contexts are not part of this source measurement.

Code execution is separate from behavioral assertions and visual fidelity. A high percentage does not prove API persistence, permission correctness, design fidelity, deployment behavior or audiovisual quality. Keep the real flow assertions and Figma review alongside the report. Do not close frontend #60 based only on the earlier helper percentage.

Three shared files sit under owned-named directories but have only other owners’ current consumers: `auth/brand-lockup.tsx` (admin login), `profile/account-chrome.tsx` (reviews), and `profile/quick-actions.tsx` (advisor profile/earnings). Their explicit exclusions and reasons are included in `scope.json`. The obsolete `auth-chrome.tsx` had no imports or uses of any of its exports and was removed; it is not hidden from the report while remaining live code.

Browser artifacts use a separate ignored `ui-coverage/` directory so the ordinary unit coverage cleanup cannot erase them.

## Baseline — 1 November 2026

The full 45-scenario local run passes, but the owned-source gate remains **failing**: 79.83% statements, 68.34% branches, 72.00% functions and 81.87% lines across 62 owned source files. Seven files never appeared in an exercised browser bundle. This baseline includes the same-compiler zero-count warmup and verifies each captured owned source against the current file contents. The source hash is recorded in `scope.json`; captures from changed source revisions are rejected.

This is measurement groundwork, not completion of #60. Next work includes real advisor service detail/availability wiring (legacy routes still render fixture data), legal/logout paths, profile error states and rescheduling. Code execution figures must not be presented as visual acceptance.

## Service-detail follow-up — 1 November 2026

The live service-detail and service-schedule routes now read owner data and real slots. Desktop and phone browser proof includes profile-save invalidation, date-specific rules and exact session links. See `docs/review/service-detail.md`. The baseline above predates this work; no new whole-UI percentage is claimed.
