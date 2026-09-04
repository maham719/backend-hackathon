import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
    getMyNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "../controllers/notification.controller.js";

const notificationRouter = express.Router();

notificationRouter.get("/", authenticate, getMyNotifications);
notificationRouter.patch("/read-all", authenticate, markAllNotificationsAsRead);
notificationRouter.patch("/:notificationId/read", authenticate, markNotificationAsRead);

export default notificationRouter;
