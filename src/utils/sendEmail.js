import { Resend } from "resend";
import config from "../config/config.js";

const resend = new Resend(config.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: "onboarding@resend.dev",
            to,
            subject,
            html,
        });

        if (error) {
            console.error("Resend email error:", error);
            throw new Error(error.message);
        }

        console.log("Email sent successfully:", data);
        return data;

    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};