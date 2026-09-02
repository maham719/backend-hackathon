import User from "../models/user.model.js";
import crypto from "crypto";
import Ticket from "../models/ticket.model.js";
import {
    getSettingsService,
    updateSettingsService
} from "../services/admin.service.js";
// CREATE AGENT
export const createAgent = async (req, res) => {
    try {
        const { username, email, password, category } = req.body;

        if (!username || !email || !password || !category) {
            return res.status(400).json({
                message: "Username, email, password and category are required"
            });
        }

        const allowedCategories = [
            "technical",
            "billing",
            "account",
            "general"
        ];

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                message: "Invalid category"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: "A user with this email already exists"
            });
        }

        const hashedPassword = crypto
            .createHash("sha256")
            .update(password)
            .digest("hex");

        const agent = await User.create({
            username,
            email,
            password: hashedPassword,
            role: "agent",
            category,
            active: true
        });

        const agentResponse = {
            _id: agent._id,
            username: agent.username,
            email: agent.email,
            role: agent.role,
            category: agent.category,
            active: agent.active,
            assignedTickets: 0,
            inProgress: 0,
            resolved: 0
        };

        return res.status(201).json({
            message: "Agent created successfully",
            agent: agentResponse
        });

    } catch (error) {
        console.error("Create agent error:", error);

        return res.status(500).json({
            message: "Failed to create agent"
        });
    }
};

// GET ALL AGENTS
export const getAgents = async (req, res) => {
    try {

        const agents = await User.aggregate([
            {
                $match: {
                    role: "agent"
                }
            },

            {
                $lookup: {
                    from: "tickets",
                    localField: "_id",
                    foreignField: "assignedAgent",
                    as: "tickets"
                }
            },

            {
                $addFields: {
                    assignedTickets: {
                        $size: "$tickets"
                    },

                    inProgress: {
                        $size: {
                            $filter: {
                                input: "$tickets",
                                as: "ticket",
                                cond: {
                                    $eq: ["$$ticket.status", "in_progress"]
                                }
                            }
                        }
                    },

                    resolved: {
                        $size: {
                            $filter: {
                                input: "$tickets",
                                as: "ticket",
                                cond: {
                                    $eq: ["$$ticket.status", "resolved"]
                                }
                            }
                        }
                    }
                }
            },

            {
                $project: {
                    password: 0,
                    tickets: 0,
                    verified: 0
                }
            }
        ]);

        return res.status(200).json({
            agents
        });

    } catch (error) {

        console.error("Get agents error:", error);

        return res.status(500).json({
            message: "Failed to fetch agents"
        });
    }
};


// UPDATE AGENT STATUS
export const updateAgentStatus = async (req, res) => {
    try {

        const { agentId } = req.params;
        const { active } = req.body;

        if (typeof active !== "boolean") {
            return res.status(400).json({
                message: "Active must be a boolean"
            });
        }


        

        const agent = await User.findOneAndUpdate(
            {
                _id: agentId,
                role: "agent"
            },
            {
                active
            },
            {
                new: true
            }
        ).select("-password");

        if (!agent) {
            return res.status(404).json({
                message: "Agent not found"
            });
        }

        return res.status(200).json({
            message: active
                ? "Agent activated successfully"
                : "Agent deactivated successfully",

            agent
        });

    } catch (error) {

        console.error("Update agent status error:", error);

        return res.status(500).json({
            message: "Failed to update agent status"
        });
    }
};


// GET DASHBOARD ANALYTICS

// GET DASHBOARD ANALYTICS

export const getAnalytics = async (req, res) => {
    try {
        const requestedRange = Number(req.query.range);

        const range = [7, 30, 90].includes(requestedRange)
            ? requestedRange
            : 7;

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - (range - 1));

        // Tickets within selected analytics range
        const tickets = await Ticket.find({
            createdAt: { $gte: startDate }
        })
            .select(
                "status category priority assignedAgent createdAt aiConfidence subject"
            )
            .lean();

        // Tickets that currently require attention
        // This is NOT limited to the selected analytics range.
       const requiresAttention = await Ticket.find({
    priority: { $in: ["urgent", "high"] }
})
    .select(
        "subject status priority assignedAgent createdAt"
    )
            .select(
                "subject status priority assignedAgent createdAt"
            )
            .populate("assignedAgent", "username")
            .sort({ updatedAt: -1 })
            .limit(5)
            .lean();

        // Get all agents
        const agents = await User.find({
            role: "agent"
        })
            .select("username")
            .sort({ username: 1 })
            .lean();

        const count = (items, predicate) =>
            items.filter(predicate).length;

        // Resolved tickets
        const resolvedTickets = count(
            tickets,
            ticket => ticket.status === "resolved"
        );

        // AI analyzed tickets
        const aiAnalyzed = count(
            tickets,
            ticket =>
                ticket.aiConfidence !== null &&
                ticket.aiConfidence !== undefined
        );

        // Volume by day
        const byDay = Array.from(
            { length: range },
            (_, index) => {
                const date = new Date(startDate);

                date.setDate(
                    startDate.getDate() + index
                );

                const dateKey = date
                    .toISOString()
                    .slice(0, 10);

                return {
                    date: dateKey,

                    label: date.toLocaleDateString(
                        "en-US",
                        {
                            month: "short",
                            day: "numeric"
                        }
                    ),

                    created: count(
                        tickets,
                        ticket =>
                            ticket.createdAt
                                ?.toISOString()
                                .slice(0, 10) === dateKey
                    ),

                    resolved: count(
                        tickets,
                        ticket =>
                            ticket.status === "resolved" &&
                            ticket.createdAt
                                ?.toISOString()
                                .slice(0, 10) === dateKey
                    )
                };
            }
        );

        // Agent performance
        const agentPerformance = agents.map(agent => ({
            _id: agent._id,

            name: agent.username,

            assigned: count(
                tickets,
                ticket =>
                    ticket.assignedAgent?.toString() ===
                    agent._id.toString()
            ),

            resolved: count(
                tickets,
                ticket =>
                    ticket.assignedAgent?.toString() ===
                        agent._id.toString() &&
                    ticket.status === "resolved"
            ),

            inProgress: count(
                tickets,
                ticket =>
                    ticket.assignedAgent?.toString() ===
                        agent._id.toString() &&
                    ticket.status === "in_progress"
            )
        }));

        return res.status(200).json({
            success: true,

            range,

            summary: {
                totalTickets: tickets.length,

                newTickets: count(
                    tickets,
                    ticket => ticket.status === "open"
                ),

                assignedTickets: count(
                    tickets,
                    ticket => ticket.assignedAgent
                ),

                inProgressTickets: count(
                    tickets,
                    ticket =>
                        ticket.status === "in_progress"
                ),

                resolvedTickets,

                resolutionRate: tickets.length
                    ? Math.round(
                        (resolvedTickets / tickets.length) * 100
                    )
                    : 0
            },

            volume: byDay,

            status: [
                "open",
                "assigned",
                "in_progress",
                "resolved"
            ].map(value => ({
                label:
                    value === "in_progress"
                        ? "In Progress"
                        : value[0].toUpperCase() +
                          value.slice(1),

                value:
                    value === "assigned"
                        ? count(
                            tickets,
                            ticket => ticket.assignedAgent
                        )
                        : count(
                            tickets,
                            ticket =>
                                ticket.status === value
                        )
            })),

            category: [
                "billing",
                "technical",
                "account",
                "general"
            ].map(value => ({
                label:
                    value[0].toUpperCase() +
                    value.slice(1),

                value: count(
                    tickets,
                    ticket =>
                        ticket.category === value
                )
            })),

            priority: [
                "urgent",
                "high",
                "medium",
                "low"
            ].map(value => ({
                label:
                    value[0].toUpperCase() +
                    value.slice(1),

                value: count(
                    tickets,
                    ticket =>
                        ticket.priority === value
                )
            })),

            agentPerformance,

            // AI TRIAGE
            aiTriage: {
                analyzed: aiAnalyzed
            },

            // REQUIRES ATTENTION
            requiresAttention
        });

    } catch (error) {
        console.error(
            "Get analytics error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch analytics"
        });
    }
};


export const getCustomers = async (req, res) => {
    try {
        const customers = await User.find({ role: "user" })
            .select("username email createdAt")
            .sort({ createdAt: -1 })
            .lean();

        const customerRows = await Promise.all(
            customers.map(async (customer) => {
                const [totalTickets, openTickets, resolvedTickets] =
                    await Promise.all([
                        Ticket.countDocuments({
                            customer: customer._id
                        }),

                        Ticket.countDocuments({
                            customer: customer._id,
                            status: {
                                $in: ["open", "in_progress"]
                            }
                        }),

                        Ticket.countDocuments({
                            customer: customer._id,
                            status: "resolved"
                        })
                    ]);

                return {
                    ...customer,
                    totalTickets,
                    openTickets,
                    resolvedTickets
                };
            })
        );

        return res.status(200).json({
            success: true,
            customers: customerRows
        });

    } catch (error) {
        console.error("Get Customers Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch customers."
        });
    }
};


export const getCustomerById = async (req, res) => {
    try {
        const customer = await User.findOne({
            _id: req.params.customerId,
            role: "user"
        })
            .select("username email createdAt")
            .lean();

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found."
            });
        }

        const tickets = await Ticket.find({
            customer: customer._id
        })
            .select("subject category priority status createdAt")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            customer,
            tickets
        });

    } catch (error) {
        console.error("Get Customer Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch customer."
        });
    }
};

export const getSettings = async (req, res) => {
    try {
        const settings = await getSettingsService();

        return res.status(200).json({
            success: true,
            settings
        });

    } catch (error) {
        console.error("Get settings error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch settings"
        });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const settings = await updateSettingsService(req.body);

        return res.status(200).json({
            success: true,
            message: "Settings updated successfully",
            settings
        });

    } catch (error) {
        console.error("Update settings error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update settings"
        });
    }
};