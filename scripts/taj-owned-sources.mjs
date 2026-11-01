import { readdir } from "node:fs/promises";
import path from "node:path";

// Ownership comes from the five Taj groups in the shared workload workbook.
export const workloadUrl =
  "https://drive.google.com/file/d/1W3V-NP37qe2dh-Nrz7OZBpXYGGuOwkDZ/view";
export const sharedSourcesOutsideScope = {
  "components/auth/brand-lockup.tsx":
    "Current consumer is admin-login-screen (outside Taj's workload).",
  "components/profile/account-chrome.tsx":
    "Current consumer is my-reviews-screen (outside Taj's workload).",
  "components/profile/quick-actions.tsx":
    "Current consumer is advisor-profile-screens (outside Taj's workload).",
};
const directories = [
  "components/auth",
  "components/profile",
  "components/legal",
  "components/advisor-services",
  "components/availability",
  "components/bookings",
  "lib/advisor-services",
  "lib/availability",
];
const files = [
  "components/service/service-booking.tsx",
  "components/session/access-gate.tsx",
  "components/work/advisor-calendar-screen.tsx",
  "components/work/session-detail.tsx",
  "lib/api/account.ts",
  "lib/api/auth.ts",
  "lib/api/advisor-bookings.ts",
  "lib/api/my-bookings.ts",
  "lib/session/index.ts",
  "lib/session/access.ts",
  "lib/work/booking-calendar.ts",
];
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const name = path.join(directory, entry.name);
        return entry.isDirectory()
          ? walk(name)
          : /(?<!\.d)\.tsx?$/.test(name)
            ? [name]
            : [];
      }),
    )
  ).flat();
}
export async function ownedSources(root = process.cwd()) {
  const nested = (
    await Promise.all(
      directories.map((directory) => walk(path.join(root, directory))),
    )
  ).flat();
  return [
    ...new Set([...nested, ...files.map((file) => path.join(root, file))]),
  ]
    .filter((file) => !(path.relative(root, file) in sharedSourcesOutsideScope))
    .sort();
}
