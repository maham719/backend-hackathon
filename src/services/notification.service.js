import Notification from "../models/notification.model.js";

export const createMessageNotification = async ({
    recipientId,
    senderId,
    ticketId,
    senderRole
}) => {
    if (!recipientId || recipientId.toString() === senderId.toString()) {
        return null;
    }

    const senderLabel = senderRole === "agent" ? "Your support agent" : "Your customer";

    return Notification.create({
        recipient: recipientId,
        sender: senderId,
        ticket: ticketId,
        type: "new_message",
        title: "New message",
        message: `${senderLabel} sent you a new message.`,
    });
};
