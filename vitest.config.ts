import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(__dirname, "."),
};

export default defineConfig({
  resolve: { alias },
  test: {
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
      exclude: [
        "lib/**/*.test.ts",
        "lib/types/**",
        "components/**/*.test.tsx",
        "components/**/*.test.ts",
      ],
      // Ratcheted from measured coverage after component tests (~48% lines / ~33% branches).
      thresholds: {
        lines: 44,
        functions: 36,
        branches: 30,
        statements: 44,
      },
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: "lib",
          environment: "node",
          include: ["lib/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "components",
          environment: "jsdom",
          include: ["components/**/*.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.tsx"],
        },
      },
    ],
  },
});
