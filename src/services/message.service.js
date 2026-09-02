import Message from "../models/message.model.js";

export const createMessageService = async ({
    ticketId,
    senderId,
    senderRole,
    content
}) => {

    const message = await Message.create({
        ticket: ticketId,
        sender: senderId,
        senderRole,
        content
    });

    return message;
};


export const getTicketMessagesService = async (ticketId) => {

    const messages = await Message.find({
        ticket: ticketId
    })
        .populate("sender", "name email")
        .sort({ createdAt: 1 });

    return messages;
};