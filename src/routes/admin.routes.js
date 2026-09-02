import express from "express";

import {
    createAgent,
    getAgents,
    getAnalytics,
    updateAgentStatus
} from "../controllers/admin.controller.js";

import {
    authenticate,
    requireAdmin
} from "../middlewares/auth.middleware.js";

const adminRouter = express.Router();

adminRouter.post(
    "/agents",
    authenticate,
    requireAdmin,
    createAgent
);

adminRouter.get(
    "/agents",
    authenticate,
    requireAdmin,
    getAgents
);

adminRouter.patch(
    "/agents/:agentId/status",
    authenticate,
    requireAdmin,
    updateAgentStatus
);
adminRouter.get(
    "/analytics",
    authenticate,
    requireAdmin,
    getAnalytics
);

export default adminRouter;