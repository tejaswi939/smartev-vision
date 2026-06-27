import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";

export const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.use("/api/v1/auth", authRoutes);
router.use("/api/v1/users", userRoutes);
