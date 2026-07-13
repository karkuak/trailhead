import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";

// Vitest doesn't auto-load .env.local like Next does; pull DATABASE_URL from
// it the same way `next dev`/`next build` do.
if (fs.existsSync(path.resolve(__dirname, ".env.local"))) {
  process.loadEnvFile(path.resolve(__dirname, ".env.local"));
}

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
