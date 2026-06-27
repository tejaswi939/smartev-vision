import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// Force the test database for all api tests (override any shell-provided value).
config({ path: "./.env.test", override: true });

export default defineConfig({
  test: {
    environment: "node",
    pool: "forks",
    fileParallelism: false,
  },
});
