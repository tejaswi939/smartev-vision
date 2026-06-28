import { Router } from "express";
import { asyncHandler } from "../controllers/helpers.js";
import { optionalAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/session.controller.js";
import * as predictionCtrl from "../controllers/prediction.controller.js";

export const sessionRoutes: Router = Router();

// Anonymous sessions are allowed; optionalAuth ties the session to a user when logged in.
sessionRoutes.post("/", optionalAuth, asyncHandler(ctrl.postSession));
sessionRoutes.post("/:id/end", asyncHandler(ctrl.postEnd));
sessionRoutes.post("/:id/gaze", asyncHandler(ctrl.postGaze));
sessionRoutes.post("/:id/interactions", asyncHandler(ctrl.postInteractions));
sessionRoutes.get("/:id/prediction", optionalAuth, asyncHandler(predictionCtrl.getPrediction));
