import { BrevoClient } from "@getbrevo/brevo";
import config from "../config/config.js";

const brevo = new BrevoClient({
    apiKey: config.BREVO_API_KEY,
});

const sendEmail = async (to, subject, text, html) => {
    try {
        const result = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                name: "SupportFlow",
                email: "zohameer96@gmail.com",
            },
            to: [
                {
                    email: to,
                },
            ],
            subject,
            textContent: text,
            htmlContent: html,
        });

        console.log("Email sent:", result.messageId);

        return result;
    } catch (error) {
        console.error("Brevo error:", error);
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

    await sendEmail(
        to,
        emailSubject,
        text,
        html
    );
};

export {
    sendEmail,
    sendTicketResolvedEmail
};
