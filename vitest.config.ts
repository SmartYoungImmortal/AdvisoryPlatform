import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: [
        "lib/api/auth.ts",
        "components/bookings/booking-flow.ts",
        "lib/availability/editor.ts",
        "lib/advisor-services/form.ts",
        "components/onboarding/file-pick.tsx",
      ],
      exclude: ["**/*.d.ts"],
      reporter: ["text", "lcov"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
