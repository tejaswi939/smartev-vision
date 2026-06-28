import { Router } from "express";
import { asyncHandler } from "../controllers/helpers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as ctrl from "../controllers/feedback.controller.js";

export const feedbackRoutes: Router = Router();

// POST /api/v1/feedback — any authenticated user can submit feedback
feedbackRoutes.post("/feedback", requireAuth, asyncHandler(ctrl.postFeedback));

// GET /api/v1/vehicles/:slug/feedback — analyst/admin only
feedbackRoutes.get(
  "/vehicles/:slug/feedback",
  requireAuth,
  requireRole("ANALYST", "ADMIN"),
  asyncHandler(ctrl.getVehicleFeedback),
);

// GET /api/v1/analytics/feedback-summary — analyst/admin only
feedbackRoutes.get(
  "/analytics/feedback-summary",
  requireAuth,
  requireRole("ANALYST", "ADMIN"),
  asyncHandler(ctrl.getFeedbackSummary),
);
