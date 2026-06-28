import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../controllers/helpers.js";
import * as ctrl from "../controllers/user.controller.js";

export const userRoutes: Router = Router();

userRoutes.patch("/me", requireAuth, asyncHandler(ctrl.updateMe));
userRoutes.get("/", requireAuth, requireRole("ADMIN"), asyncHandler(ctrl.listUsers));
userRoutes.patch("/:id/role", requireAuth, requireRole("ADMIN"), asyncHandler(ctrl.updateUserRole));
