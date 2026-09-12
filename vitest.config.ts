import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    maxWorkers: 2,
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts"],
      exclude: ["**/*.d.ts"],
      reporter: ["text", "json", "json-summary", "html"],
      thresholds: { perFile: true, lines: 100, statements: 100, branches: 100, functions: 100 },
    },
  },
});
