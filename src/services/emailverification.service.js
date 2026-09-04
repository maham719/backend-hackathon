import axios from "axios";
import config from "../config/config.js";

const verifyEmailDeliverability = async (email) => {
    const trimmedEmail = String(email || "").trim();

    if (!trimmedEmail) {
        throw new Error("Email is required");
    }

    try {
        const response = await axios.get(
            "https://apilayer.net/api/check",
            {
                params: {
                    access_key: config.EMAIL_VALIDATION_API_KEY,
                    email: trimmedEmail,
                    format: "1",
                    smtp: "1"
                }
            }
        );

        const payload = response.data ?? {};

        if (payload.success === false) {
            const apiError = payload.error?.info || "Email validation failed";
            throw new Error(apiError);
        }

        const normalizedPayload = {
            ...payload,
            status: payload.status || payload.result || "",
            result: payload.result || payload.status || "",
            format_valid: payload.format_valid ?? payload.formatValid,
            smtp_check: payload.smtp_check ?? payload.smtpCheck,
            mx_found: payload.mx_found ?? payload.mxFound,
            do_not_mail: payload.do_not_mail ?? payload.doNotMail,
            disposable: payload.disposable ?? payload.is_disposable,
            role: payload.role ?? payload.is_role,
            accept_all: payload.accept_all ?? payload.catch_all,
        };

        console.log("Mailboxlayer validation response:", normalizedPayload);

        return normalizedPayload;
    } catch (error) {
        const errorMessage =
            error.response?.data?.error?.info ||
            error.response?.data?.message ||
            error.message;

        console.error("Mailboxlayer validation error:", errorMessage);

        throw error;
    }
};

export { verifyEmailDeliverability };