import http from "http";
import { Server } from "socket.io";
import app from "./src/app.js";
import connectToDB from "./src/config/db.js";
import jwt from "jsonwebtoken";
import config from "./src/config/config.js"
import Ticket from "./src/models/ticket.model.js"
import Message from "./src/models/message.model.js"
connectToDB()

const PORT = 3006;

// Create HTTP server using Express app
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://frontend-hackathon-ashen.vercel.app/",
            "https://frontend-hackathon-pp7kl1wnl-mahams-projects-2fa71fb6.vercel.app/"
        ],
        credentials: true
    }
});
app.set("io", io);
io.use((socket, next) => {

    try {

        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error("Access token required"));
        }

        const decoded = jwt.verify(
            token,
            config.JWT_SECRET
        );

        socket.user = decoded;

        next();

    } catch (error) {

        next(new Error("Invalid or expired access token"));

    }

});
// Socket.IO connection
io.on("connection", (socket) => {

   console.log(
    "Authenticated socket connected:",
    socket.id,
    "User:",
    socket.user.id,
    "Role:",
    socket.user.role
);

console.log("Full socket user:", socket.user);


    socket.on("join-ticket", async (ticketId, callback) => {

        try {

            // Find the ticket
            const ticket = await Ticket.findById(ticketId);

            if (!ticket) {

                return callback({
                    success: false,
                    message: "Ticket not found."
                });

            }


            // Check if user is allowed to access this ticket
            const userId = socket.user.id;
            const userRole = socket.user.role;


            const isCustomer =
                ticket.customer.toString() === userId;

            const isAssignedAgent =
                ticket.assignedAgent &&
                ticket.assignedAgent.toString() === userId;

            const isAdmin =
                userRole === "admin";


            if (
                !isCustomer &&
                !isAssignedAgent &&
                !isAdmin
            ) {

                return callback({
                    success: false,
                    message: "You are not allowed to access this ticket."
                });

            }


            // Create the room name
            const roomName = `ticket:${ticketId}`;


            // Join the room
            socket.join(roomName);


            console.log(
                `User ${userId} joined ${roomName}`
            );


            callback({
                success: true,
                message: "Joined ticket successfully."
            });

        } catch (error) {

            console.error(
                "Join Ticket Error:",
                error
            );

            callback({
                success: false,
                message: "Failed to join ticket."
            });
        }

    });


    socket.on("send-message", async ({ ticketId, content }, callback) => {
    try {
        if (!ticketId || !content || !content.trim()) {
            return callback({
                success: false,
                message: "Ticket ID and message content are required."
            });
        }

        // Find ticket
        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            return callback({
                success: false,
                message: "Ticket not found."
            });
        }

        // Check access
        const userId = socket.user.id;
        const userRole = socket.user.role;

        const isCustomer =
            ticket.customer.toString() === userId;

        const isAssignedAgent =
            ticket.assignedAgent &&
            ticket.assignedAgent.toString() === userId;

        const isAdmin =
            userRole === "admin";

        if (!isCustomer && !isAssignedAgent && !isAdmin) {
            return callback({
                success: false,
                message: "You are not allowed to send messages to this ticket."
            });
        }

        // Create message
        const message = await Message.create({
            ticket: ticketId,
            sender: userId,
            senderRole: userRole,
            content: content.trim()
        });

        // Populate sender
        await message.populate(
            "sender",
            "username email role"
        );

        // Emit message to everyone in this ticket room
        io.to(`ticket:${ticketId}`).emit(
            "new-message",
            message
        );

        const recipientId =
    socket.user.role === "agent"
        ? ticket.customer.toString()
        : ticket.assignedAgent?.toString();

if (recipientId) {
    io.sockets.sockets.forEach((connectedSocket) => {
        if (connectedSocket.user?.id === recipientId) {
            connectedSocket.emit("notification", {
                type: "new_message",
                ticketId,
                title: "New message",
                message:
                    socket.user.role === "agent"
                        ? "Agent sent a new message"
                        : "Customer sent a new message",
                senderId: socket.user.id,
            });
        }
    });
}

        // Confirm to sender
        callback({
            success: true,
            message: "Message sent successfully.",
            data: message
        });

    } catch (error) {
        console.error("Send Message Error:", error);

        callback({
            success: false,
            message: "Failed to send message."
        });
    }
});

socket.on("typing", ({ ticketId }) => {
    if (!ticketId) return;

    socket.to(`ticket:${ticketId}`).emit("user-typing", {
        userId: socket.user.id
    });
});

socket.on("stop-typing", ({ ticketId }) => {
    if (!ticketId) return;

    socket.to(`ticket:${ticketId}`).emit("user-stop-typing", {
        userId: socket.user.id
    });
});


    socket.on("disconnect", () => {

        console.log(
            "Socket disconnected:",
            socket.id
        );

    });

});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
