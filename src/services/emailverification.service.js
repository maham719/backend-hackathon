import axios from "axios";
import config from "../config/config.js";

const verifyEmailDeliverability = async (email) => {
    try {
        const response = await axios.get(
            "https://emailreputation.abstractapi.com/v1/",
            {
                params: {
                    api_key: config.EMAIL_VALIDATION_API_KEY,
                    email
                }
            }
        );

        console.log("EMAIL REPUTATION RESPONSE:", response.data);

        return response.data;

    } catch (error) {
        console.error(
            "Email reputation API error:",
            error.response?.data || error.message
        );

        throw error;
    }
};

export { verifyEmailDeliverability };