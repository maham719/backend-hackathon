import Notification from "../models/notification.model.js";

export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate("ticket", "subject")
            .populate("sender", "username role")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const unreadCount = await Notification.countDocuments({
            recipient: req.user.id,
            isRead: false,
        });

        return res.status(200).json({ success: true, notifications, unreadCount });
    } catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch notifications." });
    }
};

export const markNotificationAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.notificationId, recipient: req.user.id },
            { $set: { isRead: true } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }

        return res.status(200).json({ success: true, notification });
    } catch (error) {
        console.error("Mark notification read error:", error);
        return res.status(500).json({ success: false, message: "Failed to update notification." });
    }
};

export const markAllNotificationsAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Mark all notifications read error:", error);
        return res.status(500).json({ success: false, message: "Failed to update notifications." });
    }
};
