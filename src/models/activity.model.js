import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
    {
        ticket: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ticket",
            required: true
        },

        type: {
            type: String,
            enum: [
                "created",
                "assigned",
                "status_changed",
                "resolved",
                "closed",
                "message_added"
            ],
            required: true
        },

        message: {
            type: String,
            required: true,
            trim: true
        },

        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;