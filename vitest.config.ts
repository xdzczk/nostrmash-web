import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**/*.{ts,tsx}"],
      exclude: ["lib/**/*.test.ts", "lib/types/**"],
      // Ratcheted from measured coverage (~41% lines / ~28% branches).
      thresholds: {
        lines: 38,
        functions: 28,
        branches: 25,
        statements: 38,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
