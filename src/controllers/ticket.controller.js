
import {
  createTicketService,
  getAgentTicketsService,
  getAllTicketsService,
  getCustomerTicketsService,
  getTicketByIdService,
  resolveTicketService
} from "../services/ticket.service.js";

import Ticket from "../models/ticket.model.js";
import User from "../models/user.model.js";
import Activity from "../models/activity.model.js";

export const createTicket = async (req, res) => {

    try {

        const {
            subject,
            description,
            customerCategory,
            customerUrgency
        } = req.body;

        // Basic validation
        if (!subject || !description) {
            return res.status(400).json({
                success: false,
                message: "Subject and description are required."
            });
        }

        // Create ticket through service
        const ticket = await createTicketService({
            customerId: req.user.id,
            subject,
            description,
            customerCategory,
            customerUrgency
        });

        return res.status(201).json({
            success: true,
            message: "Ticket created successfully.",
            ticket
        });

    } catch (error) {

        console.error("Create Ticket Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create ticket."
        });
    }
};

export const reviewAISuggestions = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const {
            category,
            priority,
            assignedAgent,
            accepted
        } = req.body;

        const validCategories = [
            "technical",
            "billing",
            "account",
            "general"
        ];

        const validPriorities = [
            "low",
            "medium",
            "high",
            "urgent"
        ];

        // Validate category
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket category"
            });
        }

        // Validate priority
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket priority"
            });
        }

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        // Make sure the selected user is actually an active agent
        const agent = await User.findOne({
            _id: assignedAgent,
            role: "agent",
            active: true
        });

        if (!agent) {
            return res.status(400).json({
                success: false,
                message: "Invalid or inactive agent"
            });
        }

        // Finalize reviewed values
        ticket.category = category;
        ticket.priority = priority;
        ticket.assignedAgent = assignedAgent;

        ticket.aiReviewed = true;
        ticket.aiAccepted = accepted === true;

        await ticket.save();

        await Activity.create({
    ticket: ticket._id,
    type: "assigned",
    message: `Ticket assigned to agent ${assignedAgent}`,
    performedBy: req.user.id
});
        return res.status(200).json({
            success: true,
            message: accepted === true
                ? "AI suggestions accepted"
                : "AI suggestions reviewed and updated",
            ticket
        });

    } catch (error) {
        console.error("AI review error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to review AI suggestions"
        });
    }
};
export const getCustomerTickets = async (req, res) => {

    try {

        const tickets = await getCustomerTicketsService(
            req.user.id
        );

        return res.status(200).json({
            success: true,
            tickets
        });

    } catch (error) {

        console.error("Get Customer Tickets Error:", error);

        return res.status(500).json({

        success: false,
            message: error.message || "Failed to fetch tickets."
        });
    }
};

export const getAllTickets = async (req, res) => {
    try {
        const tickets = await getAllTicketsService();

        return res.status(200).json({ success: true, tickets });
    } catch (error) {
        console.error("Get All Tickets Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch tickets."
        });
    }
};
    
export const getTicketById = async (req, res) => {

    try {

        const { ticketId } = req.params;

      const ticket = await getTicketByIdService({
    ticketId,
    customerId: req.user.id,
    isAdmin: req.user.role === "admin",
    isAgent: req.user.role === "agent"
});

        return res.status(200).json({
            success: true,
            ticket
        });

    } catch (error) {

        console.error("Get Ticket Error:", error);

        return res.status(404).json({
            success: false,
            message: error.message || "Ticket not found."
        });
    }
};

export const getAgentTickets = async (req, res) => {
    try {
        const agentId = req.user.id;

        const tickets = await getAgentTicketsService(agentId);

        return res.status(200).json({
            success: true,
            tickets
        });

    } catch (error) {
        console.error("Get Agent Tickets Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch agent tickets"
        });
    }
};

export const resolveTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { resolutionNote } = req.body;

        if (!resolutionNote || !resolutionNote.trim()) {
            return res.status(400).json({
                success: false,
                message: "Resolution note is required."
            });
        }

        const ticket = await resolveTicketService({
            ticketId,
            agentId: req.user.id,
            resolutionNote
        });

        return res.status(200).json({
            success: true,
            message: "Ticket resolved successfully.",
            ticket
        });

    } catch (error) {
        console.error("Resolve Ticket Error:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Failed to resolve ticket."
        });
    }
};