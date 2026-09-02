
import { analyzeTicket } from "./ai.service.js";

const testAI = async () => {
    try {

        const result = await analyzeTicket(
            "Unable to login to my account",
            "I have been trying to login for the past hour. My password is correct but I keep getting an invalid password error."
        );

        console.log("AI RESULT:");
        console.log(result);

    } catch (error) {

        console.error("AI ERROR:");
        console.error(error.message);

    }
};

testAI();