import express from "express";
import { createTicket,getAllTickets,getCustomerTickets ,getTicketById,    reviewAISuggestions,getAgentTickets, resolveTicket, reopenTicket} from "../controllers/ticket.controller.js";
import { authenticate ,requireAdmin,requireAgent} from "../middlewares/auth.middleware.js";
import { getTicketMessages,createMessage } from "../controllers/message.controller.js";

const ticketRouter = express.Router();

ticketRouter.get("/admin", authenticate,requireAdmin, getAllTickets);
ticketRouter.get("/agent", authenticate, requireAgent, getAgentTickets);
ticketRouter.post("/",authenticate, createTicket);
ticketRouter.get("/", authenticate,  getCustomerTickets);
ticketRouter.get("/:ticketId", authenticate, getTicketById);
ticketRouter.get(
    "/:ticketId/messages",
    authenticate,
    getTicketMessages
);
ticketRouter.post(
    "/:ticketId/messages",
    authenticate,
    createMessage
);
ticketRouter.patch(
    "/:ticketId/ai-review",
    authenticate,
    requireAgent,
    reviewAISuggestions
);
ticketRouter.patch(
    "/:ticketId/resolve",
    authenticate,
    requireAgent,
    resolveTicket
);
ticketRouter.patch(
    "/:ticketId/reopen",
    authenticate,
    requireAgent,
    reopenTicket
);
export default ticketRouter;