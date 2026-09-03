import nodemailer from "nodemailer"
import config from "../config/config.js"

const transporter=nodemailer.createTransport({
    service:'gmail',
    auth:{
        type:'OAuth2',
    user:config.GOOGLE_USER,
    clientId:config.GOOGLE_CLIENT_ID,
    clientSecret:config.GOOGLE_CLIENT_SECRET,
    refreshToken:config.GOOGLE_REFRESH_TOKEN
    }
})

transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});


const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Your Name" <${config.GOOGLE_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
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
export { transporter ,sendEmail,sendTicketResolvedEmail}