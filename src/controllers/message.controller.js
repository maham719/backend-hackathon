import Message from "../models/message.model.js";
import Ticket from "../models/ticket.model.js";
import { createMessageNotification } from "../services/notification.service.js";


// GET messages for a ticket
export const getTicketMessages = async (req, res) => {
    try {

        const { ticketId } = req.params;

        // Find the ticket
        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found."
            });
        }

        // Check whether the logged-in user can access this ticket
        const userId = req.user.id;
        const userRole = req.user.role;

        const isCustomer =
            ticket.customer.toString() === userId;

        const isAssignedAgent =
            ticket.assignedAgent &&
            ticket.assignedAgent.toString() === userId;

        const isAdmin =
            userRole === "admin";

        if (
            !isCustomer &&
            !isAssignedAgent &&
            !isAdmin
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to access this ticket."
            });
        }

        // Get messages
        const messages = await Message.find({
            ticket: ticketId
        })
            .populate("sender", "username email role")
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            messages
        });

    } catch (error) {

        console.error("Get Ticket Messages Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch messages."
        });
    }
};

export const createMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message content is required."
            });
        }

        // Find the ticket
        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found."
            });
        }

        // Check whether the logged-in user can send a message
        const userId = req.user.id;
        const userRole = req.user.role;

        const isCustomer =
            ticket.customer.toString() === userId;

        const isAssignedAgent =
            ticket.assignedAgent &&
            ticket.assignedAgent.toString() === userId;

        const isAdmin =
            userRole === "admin";

        if (!isCustomer && !isAssignedAgent && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to send messages to this ticket."
            });
        }

        // Create message
        const message = await Message.create({
            ticket: ticketId,
            sender: userId,
            senderRole: userRole,
            content: content.trim()
        });

        // Populate sender information
        await message.populate(
            "sender",
            "username email role"
        );
        const io = req.app.get("io");
        const recipientId = userRole === "agent"
            ? ticket.customer.toString()
            : ticket.assignedAgent?.toString();

        const notification = await createMessageNotification({
            recipientId,
            senderId: userId,
            ticketId,
            senderRole: userRole,
        });

        if (io) {
            io.to(`ticket:${ticketId}`).emit("new-message", message);

            if (notification) {
                io.sockets.sockets.forEach((connectedSocket) => {
                    if (connectedSocket.user?.id === recipientId) {
                        connectedSocket.emit("notification", {
                            notification,
                            type: notification.type,
                            ticketId,
                            title: notification.title,
                            message: notification.message,
                            senderId: userId,
                        });
                    }
                });
            }
        }
        return res.status(201).json({
            success: true,
            message: "Message sent successfully.",
            data: message
        });

    } catch (error) {
        console.error("Create Message Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send message."
        });
    }
};
