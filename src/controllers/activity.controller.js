import Activity from "../models/activity.model.js";
import Ticket from "../models/ticket.model.js";
export const getRecentActivities = async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate("ticket", "subject")
            .populate("performedBy", "username")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        return res.status(200).json({
            success: true,
            activities
        });

    } catch (error) {
        console.error("Get recent activities error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch recent activities"
        });
    }
};

export const getMyRecentActivities = async (req, res) => {
    try {
        console.log("AUTH USER:", req.user);
        const customerId = req.user.id;

        const myTickets = await Ticket.find({
            customer: customerId
        }).select("_id");

        const ticketIds = myTickets.map(ticket => ticket._id);

        const activities = await Activity.find({
            ticket: { $in: ticketIds }
        })
            .populate("ticket", "subject status")
            .populate("performedBy", "username role")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        return res.status(200).json({
            success: true,
            activities
        });
    } catch (error) {
        console.error("Get my activities error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch your activities"
        });
    }
};