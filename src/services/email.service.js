import { Resend } from "resend";
import config from "../config/config.js";

const resend = new Resend(config.RESEND_API_KEY);

const sendEmail = async (to, subject, text, html) => {
    try {
        const { data, error } = await resend.emails.send({
            from: "SupportFlow <onboarding@resend.dev>",
            to,
            subject,
            text,
            html,
        });

        if (error) {
            console.error("Resend error:", error);
            throw new Error(error.message);
        }

        console.log("Message sent:", data.id);

        return data;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

const sendTicketResolvedEmail = async ({
    to,
    username,
    ticketNumber,
    subject,
    resolutionNote
}) => {
    const emailSubject = `SupportFlow Ticket Resolved - ${ticketNumber}`;

    const text = `
Hello ${username},

Your SupportFlow ticket has been resolved.

Ticket: ${ticketNumber}

Subject: ${subject}

Resolution:
${resolutionNote}

Thank you for contacting SupportFlow.

SupportFlow Team
`;

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>SupportFlow - Ticket Resolved</h2>

            <p>Hello ${username},</p>

            <p>
                Your support ticket has been successfully resolved.
            </p>

            <p>
                <strong>Ticket:</strong> ${ticketNumber}<br/>
                <strong>Subject:</strong> ${subject}
            </p>

            <h3>Resolution</h3>

            <p>${resolutionNote}</p>

            <p>
                Thank you for contacting SupportFlow.
            </p>

            <p>
                <strong>SupportFlow Team</strong>
            </p>
        </div>
    `;

    await sendEmail(to, emailSubject, text, html);
};

export {
    sendEmail,
    sendTicketResolvedEmail
};