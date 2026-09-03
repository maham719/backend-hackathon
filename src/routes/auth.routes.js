import { Router } from "express";
import * as authcontroller from "../controllers/auth.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";
const authRouter = Router();

authRouter.post("/register", authcontroller.register);
authRouter.post("/login", authcontroller.login);
authRouter.get("/get-me", authenticate, authcontroller.getMe);
authRouter.get("/refresh", authcontroller.refresh);
authRouter.post("/logout", authcontroller.logout);
authRouter.post("/logout-all", authcontroller.logoutAll);
authRouter.post("/verify-email", authcontroller.verifyEmail);
authRouter.post("/resend-otp", authcontroller.resendOTP);
authRouter.post("/resend-otp", authcontroller.resendOTP);





export default authRouter;
