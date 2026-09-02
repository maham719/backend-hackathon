import Activity from "../models/activity.model.js";
import Ticket from "../models/ticket.model.js";
import {
    analyzeTicket,
    assignTicketToAgent
} from "./ai.service.js";
import User from "../models/user.model.js";
import { sendTicketResolvedEmail } from "./email.service.js";
export const createTicketService = async ({
    customerId,
    subject,
    description,
      customerCategory,
    customerUrgency
}) => {

    // 1. Ask AI to analyze the ticket
    const aiResult = await analyzeTicket(
        subject,
        description
    );

const agents = await User.find({
    role: "agent",
    active: true,
    category: aiResult.category
}).select("_id username category active");

if (agents.length === 0) {
    throw new Error(
        `No active agent is available for the ${aiResult.category} category.`
    );
}
const assignment = await assignTicketToAgent(
    {
        subject,
        description,
        category: aiResult.category,
        priority: aiResult.priority,
        aiSummary: aiResult.summary
    },
    agents
);
    // 2. Create ticket in MongoDB
  const ticket = await Ticket.create({
    customer: customerId,
    subject,
    description,

    // Customer's optional selections
    customerCategory: customerCategory || null,
    customerUrgency: customerUrgency || null,

    // Final values - waiting for human review
    category: "general",
    priority: "medium",
    assignedAgent: assignment.agentId,

    // AI suggestions
    aiSuggestedCategory: aiResult.category,
    aiSuggestedPriority: aiResult.priority,
    aiSummary: aiResult.summary,
    aiConfidence: aiResult.confidence,
    aiSuggestedAgent: assignment.agentId,
aiAssignmentReason: assignment.reason,
    aiReviewed: false,
    aiAccepted: false
});

await Activity.create({
    ticket: ticket._id,
    type: "created",
    message: `Ticket ${ticket._id} created`,
    performedBy: customerId
});

    // 3. Return the created ticket
    return ticket;
};






export const getCustomerTicketsService = async (customerId) => {

    const tickets = await Ticket.find({
        customer: customerId
    })
        .sort({ createdAt: -1 });

    return tickets;
};

export const getAllTicketsService = async () => {
    return Ticket.find()
        .populate("customer", "username email")
        .populate("assignedAgent", "username email")
        .sort({ createdAt: -1 });
};
export const getTicketByIdService = async ({
    ticketId,
    customerId,
    isAdmin = false,
    isAgent = false
}) => {
    let query;

    if (isAdmin) {
        query = { _id: ticketId };
    } else if (isAgent) {
        query = {
            _id: ticketId,
            assignedAgent: customerId
        };
    } else {
        query = {
            _id: ticketId,
            customer: customerId
        };
    }

   const ticket = await Ticket.findOne(query)
    .populate("customer", "username email")
    .populate("assignedAgent", "username email")
    .populate("aiSuggestedAgent", "username email");

    if (!ticket) {
        throw new Error("Ticket not found.");
    }

    return ticket;
};

export const getAgentTicketsService = async (agentId) => {
    const tickets = await Ticket.find({
        assignedAgent: agentId
    })
        .populate("customer", "username email")
        .populate("assignedAgent", "username email")
        .sort({ createdAt: -1 });

    return tickets;
};

export const resolveTicketService = async ({
    ticketId,
    agentId,
    resolutionNote
}) => {
    const ticket = await Ticket.findOne({
        _id: ticketId,
        assignedAgent: agentId
    })
        .populate("customer", "username email")
        .populate("assignedAgent", "username email");

    if (!ticket) {
        throw new Error("Ticket not found or not assigned to this agent.");
    }

    if (ticket.status === "resolved") {
        throw new Error("Ticket is already resolved.");
    }

    if (!resolutionNote || !resolutionNote.trim()) {
        throw new Error("Resolution note is required.");
    }

    ticket.status = "resolved";
    ticket.resolutionNote = resolutionNote.trim();

    await ticket.save();

    await Activity.create({
        ticket: ticket._id,
        type: "resolved",
        message: "Ticket resolved by agent",
        performedBy: agentId
    });

    // Send resolution email to customer
    if (ticket.customer?.email) {
        await sendTicketResolvedEmail({
            to: ticket.customer.email,
            username: ticket.customer.username,
            ticketNumber: ticket._id.toString().slice(-6),
            subject: ticket.subject,
            resolutionNote: ticket.resolutionNote
        });
    }
    if (ticket.assignedAgent?.email) {
    await sendTicketResolvedEmail({
        to: ticket.assignedAgent.email,
        username: ticket.assignedAgent.username,
        ticketNumber: ticket._id.toString().slice(-6),
        subject: ticket.subject,
        resolutionNote: ticket.resolutionNote
    });
}

    return ticket;
};