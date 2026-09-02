import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
    {
        key: { type: String, unique: true, default: "supportflow" },
        supportDeskName: { type: String, default: "SupportFlow" },
        defaultTicketPriority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
        defaultTicketStatus: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open" },
        aiTriageEnabled: { type: Boolean, default: true },
        ticketNotificationsEnabled: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
