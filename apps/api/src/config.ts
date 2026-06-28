import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load the monorepo-root .env. `override` is false so values already present
// in the environment (e.g. set by vitest.config from .env.test) win.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../.env") });

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  jwtAccessSecret: req("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: req("JWT_REFRESH_SECRET"),
  accessTtl: Number(process.env.ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.REFRESH_TTL ?? 604800),
  resetTtl: Number(process.env.RESET_TTL ?? 3600),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
