import express from "express"
import authRouter from "./routes/auth.routes.js"
import cookieParser from "cookie-parser"
import ticketRouter from "./routes/ticket.routes.js"
import adminRouter from "./routes/admin.routes.js";
import activityRoutes from "./routes/activity.routes.js";
const app =express()
import cors from "cors"


app.use(cors({
   origin: [
      "http://localhost:5173",
      "https://frontend-hackathon-ashen.vercel.app",
      "https://frontend-hackathon-pp7kl1wnl-mahams-projects-2fa71fb6.vercel.app/"
    ],
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())
app.use("/api/auth",authRouter)
app.use("/api/tickets",ticketRouter)
app.use("/api/admin", adminRouter);
app.use("/api/activities", activityRoutes);
export default app
