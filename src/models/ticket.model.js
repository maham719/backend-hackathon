import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true
        },

        subject: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },
customerCategory: {
    type: String,
    enum: [
        "technical",
        "billing",
        "account",
        "general"
    ],
    default: null
},

customerUrgency: {
    type: String,
    enum: [
        "low",
        "medium",
        "high",
        "urgent"
    ],
    default: null
},
        category: {
            type: String,
            enum: [
                "technical",
                "billing",
                "account",
                "general"
            ],
            default: "general"
        },

        priority: {
            type: String,
            enum: [
                "low",
                "medium",
                "high",
                "urgent"
            ],
            default: "medium"
        },

        status: {
            type: String,
            enum: [
                "open",
                "in_progress",
                "resolved",
                "closed"
            ],
            default: "open"
        },
resolutionNote: {
    type: String,
    default: ""
},
        aiSummary: {
            type: String,
            default: ""
        },

        aiConfidence: {
            type: Number,
            min: 0,
            max: 1,
            default: null
        },
       aiSuggestedCategory: {
    type: String,
    enum: [
        "technical",
        "billing",
        "account",
        "general"
    ],
    default: null
},

aiSuggestedPriority: {
    type: String,
    enum: [
        "low",
        "medium",
        "high",
        "urgent"
    ],
    default: null
},

aiSuggestedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    default: null
},

aiReviewed: {
    type: Boolean,
    default: false
},
aiAssignmentReason: {
    type: String,
    default: ""
},
aiAccepted: {
    type: Boolean,
    default: false
},
        assignedAgent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;