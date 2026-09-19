import { ADMIN_LOGIN, DEMO_LOGIN } from "@/lib/mock-db/seed";

/**
 * The seeded accounts a tester signs in with. The login screens list them, since
 * nobody can be expected to know a fixture's password.
 */
export const demoAccounts = [
  { key: "advisee", email: "araya.s@kmitl.ac.th", password: DEMO_LOGIN },
  { key: "advisor", email: "sarah@advisory.test", password: DEMO_LOGIN },
  { key: "admin", email: "admin@advisory.test", password: ADMIN_LOGIN },
  { key: "locked", email: "locked@advisory.test", password: DEMO_LOGIN },
] as const;

export type DemoAccount = (typeof demoAccounts)[number];
