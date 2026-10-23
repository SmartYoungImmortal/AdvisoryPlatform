/**
 * The seeded accounts a tester signs in with, as the API's seed actually wrote
 * them. The login screens list them, since nobody can be expected to know a
 * fixture's password.
 *
 * These are rows in the shared Supabase database, not fixtures in the browser,
 * so the list is a transcription and not a source: renaming one here renames
 * nothing. Every one of them has the same password — the seed sets it.
 *
 * `key` is the role, and repeats: it is what `session.role.*` copy and the
 * `only` filter on the admin console's door are keyed by, so the email is what
 * identifies a row. The mock database's `locked@advisory.test` has no
 * counterpart — better-auth has no lockout to demonstrate.
 */
const PASSWORD = "AdvisoryDemo!2026";

export const demoAccounts = [
  { key: "admin", email: "admin@advisory.demo", password: PASSWORD },
  { key: "advisor", email: "araya.s@advisory.demo", password: PASSWORD },
  { key: "advisor", email: "kanya.p@advisory.demo", password: PASSWORD },
  { key: "advisor", email: "thanakrit.w@advisory.demo", password: PASSWORD },
  { key: "advisor", email: "pimchanok.r@advisory.demo", password: PASSWORD },
  { key: "advisor", email: "sarawut.k@advisory.demo", password: PASSWORD },
  { key: "advisee", email: "nattapong.d@advisory.demo", password: PASSWORD },
  { key: "advisee", email: "supaporn.t@advisory.demo", password: PASSWORD },
] as const;

export type DemoAccount = (typeof demoAccounts)[number];
