import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config.js";
import { router } from "./routes/index.js";
import { errorHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(router);
  app.use(errorHandler);
  return app;
}
