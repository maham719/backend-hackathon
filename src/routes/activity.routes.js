import express from "express";

import {
    getRecentActivities,
    getMyRecentActivities
} from "../controllers/activity.controller.js";

import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
    "/recent",
    authenticate,
    requireAdmin,
    getRecentActivities
);
router.get(
    "/my",
    authenticate,
    getMyRecentActivities
);

export default router;