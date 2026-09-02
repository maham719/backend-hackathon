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