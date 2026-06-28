import { Router } from "express";
import { asyncHandler } from "../controllers/helpers.js";
import * as ctrl from "../controllers/vehicle.controller.js";

export const vehicleRoutes: Router = Router();

vehicleRoutes.get("/", asyncHandler(ctrl.listVehicles));
vehicleRoutes.get("/:slug", asyncHandler(ctrl.getVehicle));
