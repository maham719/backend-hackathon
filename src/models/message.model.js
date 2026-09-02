import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        ticket: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ticket",
            required: true
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true
        },

        senderRole: {
            type: String,
            enum: ["user", "agent", "admin"],
            required: true
        },

        content: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;