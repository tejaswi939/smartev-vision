import { Router } from "express";
import { asyncHandler } from "../controllers/helpers.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/register", asyncHandler(ctrl.register));
authRoutes.post("/login", asyncHandler(ctrl.login));
authRoutes.post("/refresh", asyncHandler(ctrl.refresh));
authRoutes.post("/logout", requireAuth, asyncHandler(ctrl.logout));
authRoutes.post("/forgot-password", asyncHandler(ctrl.forgotPassword));
authRoutes.post("/reset-password", asyncHandler(ctrl.resetPassword));
authRoutes.get("/me", requireAuth, asyncHandler(ctrl.me));
