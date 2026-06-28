import { Router } from "express";
import { asyncHandler } from "../controllers/helpers.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as ctrl from "../controllers/analytics.controller.js";
import * as predictionCtrl from "../controllers/prediction.controller.js";

export const analyticsRoutes: Router = Router();

// Session-scoped: requireAuth, then per-session owner/analyst check in the controller.
analyticsRoutes.get("/sessions", requireAuth, asyncHandler(ctrl.listSessions));
analyticsRoutes.get("/sessions/:id/analytics", requireAuth, asyncHandler(ctrl.getSessionAnalytics));
analyticsRoutes.get("/sessions/:id/heatmap", requireAuth, asyncHandler(ctrl.getSessionHeatmap));
analyticsRoutes.get("/sessions/:id/report", requireAuth, asyncHandler(ctrl.getSessionReport));

// Aggregate views: analyst/admin only.
analyticsRoutes.get("/vehicles/:slug/analytics", requireAuth, requireRole("ANALYST", "ADMIN"), asyncHandler(ctrl.getVehicleAnalytics));
analyticsRoutes.get("/vehicles/:slug/heatmap", requireAuth, requireRole("ANALYST", "ADMIN"), asyncHandler(ctrl.getVehicleHeatmap));
analyticsRoutes.get("/vehicles/:slug/report", requireAuth, requireRole("ANALYST", "ADMIN"), asyncHandler(ctrl.getVehicleReport));
analyticsRoutes.get("/analytics/overview", requireAuth, requireRole("ANALYST", "ADMIN"), asyncHandler(ctrl.getOverview));
analyticsRoutes.get("/analytics/recommendations", requireAuth, requireRole("ANALYST", "ADMIN"), asyncHandler(predictionCtrl.getRecommendations));
