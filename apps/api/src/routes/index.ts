import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";
import { vehicleRoutes } from "./vehicle.routes.js";
import { sessionRoutes } from "./session.routes.js";
import { openapiDocument } from "../openapi.js";

export const router: Router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.use("/api/v1/auth", authRoutes);
router.use("/api/v1/users", userRoutes);
router.use("/api/v1/vehicles", vehicleRoutes);
router.use("/api/v1/sessions", sessionRoutes);

// API documentation
router.get("/api/openapi.json", (_req, res) => res.json(openapiDocument));
router.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
