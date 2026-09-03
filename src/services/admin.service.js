import Settings from "../models/settings.model.js";

export const getSettingsService = async () => {
    let settings = await Settings.findOne({ key: "supportflow" });

    // If settings don't exist yet, create default settings
    if (!settings) {
        settings = await Settings.create({
            key: "supportflow"
        });
    }

    return settings;
};

export const updateSettingsService = async (updates) => {
    const allowedFields = [
        "supportDeskName",
        "defaultTicketPriority",
        "defaultTicketStatus",
        "aiTriageEnabled",
        "ticketNotificationsEnabled"
    ];

    const filteredUpdates = {};

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            filteredUpdates[field] = updates[field];
        }
    }

    const settings = await Settings.findOneAndUpdate(
        { key: "supportflow" },
        {
            $set: filteredUpdates
        },
        {
            new: true,
            upsert: true,
            runValidators: true
        }
    );

    return settings;
};

import Ticket from "../models/ticket.model.js";
import userModel from "../models/user.model.js";

// Delete a ticket
export const deleteTicketService = async (ticketId) => {
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
        throw new Error("Ticket not found");
    }

    await Ticket.findByIdAndDelete(ticketId);

    return ticket;
};


// Delete an agent
export const deleteAgentService = async (agentId) => {
    const agent = await userModel.findById(agentId);

    if (!agent) {
        throw new Error("Agent not found");
    }

    if (agent.role !== "agent") {
        throw new Error("User is not an agent");
    }

    // Unassign all tickets assigned to this agent
    await Ticket.updateMany(
        { assignedAgent: agentId },
        {
            $set: {
                assignedAgent: null
            }
        }
    );

    // Delete the agent
    await userModel.findByIdAndDelete(agentId);

    return agent;
};