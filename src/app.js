import express from "express"
import authRouter from "./routes/auth.routes.js"
import cookieParser from "cookie-parser"
const app =express()
import cors from "cors"

app.use(cors({
   origin: [
      "http://localhost:5173",
      "https://frontend-hackathon-ashen.vercel.app",
    ],
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())
app.use("/api/auth",authRouter)

export default app
