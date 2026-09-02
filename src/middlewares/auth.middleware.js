import jwt from "jsonwebtoken";
import config from "../config/config.js";

export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer")) {
            return res.status(401).json({
                message: "Access token required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, config.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired access token"
        });
    }
};

    export const requireAdmin = (req, res, next) => {
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                message: "Admin access required"
            });
        }

        next();
    };

    export const requireAgent = (req, res, next) => {
    if (
        req.user?.role !== "agent" &&
        req.user?.role !== "admin"
    ) {
        return res.status(403).json({
            message: "Agent access required"
        });
    }

    next();
};