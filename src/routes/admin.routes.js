import express from "express";

import {
    createAgent,
    getAgents,
    getAnalytics,
    updateAgentStatus,
    getCustomers,
    getCustomerById,
     getSettings,
    updateSettings,
    deleteTicket,
    deleteAgent
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

adminRouter.get("/customers", authenticate, requireAdmin, getCustomers);

adminRouter.get(
    "/customers/:customerId",
    authenticate,
    requireAdmin,
    getCustomerById
);

adminRouter.get(
    "/settings",
    authenticate,
    requireAdmin,
    getSettings
);

adminRouter.put(
    "/settings",
    authenticate,
    requireAdmin,
    updateSettings
);

adminRouter.delete(
    "/tickets/:ticketId",
    authenticate,
    requireAdmin,
    deleteTicket
);

adminRouter.delete(
    "/agents/:agentId",
    authenticate,
    requireAdmin,
    deleteAgent
);
export default adminRouter;