import { GoogleGenAI} from "@google/genai";
import config from "../config/config.js";
const ai = new GoogleGenAI({
  apiKey: config.GOOGLE_GENAI_API_KEY
});

const geminiSchema = {
    type: "OBJECT",
    properties: {

        category: {
            type: "STRING",
            enum: [
                "technical",
                "billing",
                "account",
                "general"
            ]
        },

        priority: {
            type: "STRING",
            enum: [
                "low",
                "medium",
                "high",
                "urgent"
            ]
        },

        summary: {
            type: "STRING"
        },

        confidence: {
            type: "NUMBER",
            minimum: 0,
            maximum: 1
        }
    },

    required: [
        "category",
        "priority",
        "summary",
        "confidence"
    ]
};

export const analyzeTicket = async (subject, description) => {

    try {

        const prompt = `
You are an AI customer support ticket triage system.

Analyze the following support ticket.

Ticket Subject:
${subject}

Ticket Description:
${description}

Determine:

1. category
2. priority
3. summary
4. confidence

Category MUST be one of:
- technical
- billing
- account
- general

Priority MUST be one of:
- low
- medium
- high
- urgent

Confidence must be a number between 0 and 1.

Return ONLY valid JSON.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",

            contents: prompt,

            config: {
                responseMimeType: "application/json",
                responseSchema: geminiSchema,
                temperature: 0.0
            }
        });

        // Check if Gemini returned a response
        if (!response || !response.text) {
            throw new Error("AI did not return a response.");
        }

        // Convert AI response from JSON string to JavaScript object
        let result;

        try {
            result = JSON.parse(response.text);
        } catch (error) {
            throw new Error("AI returned invalid JSON.");
        }

        // Make sure all required fields exist
        if (
            !result.category ||
            !result.priority ||
            !result.summary ||
            result.confidence === undefined
        ) {
            throw new Error("AI response is missing required fields.");
        }

        return result;

    } catch (error) {

        console.error("AI Ticket Analysis Error:", error.message);

        throw new Error(
            `Failed to analyze support ticket: ${error.message}`
        );
    }
};


export const assignTicketToAgent = async (ticket, agents) => {
    try {
        const prompt = `
You are an AI customer support ticket assignment system.

Your job is to assign the support ticket to the most suitable available support agent.

TICKET:
Subject: ${ticket.subject}
Description: ${ticket.description}
Category: ${ticket.category}
Priority: ${ticket.priority}
Summary: ${ticket.aiSummary}

AVAILABLE AGENTS:
${JSON.stringify(agents)}

Choose the best agent based on:
1. Agent category matching the ticket category.
2. Agent availability.
3. Current workload.
4. Ticket priority.

Return ONLY valid JSON in this format:

{
    "agentId": "the selected agent's _id",
    "reason": "short explanation"
}

The agentId MUST be one of the IDs provided in AVAILABLE AGENTS.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        agentId: {
                            type: "STRING"
                        },
                        reason: {
                            type: "STRING"
                        }
                    },
                    required: [
                        "agentId",
                        "reason"
                    ]
                },
                temperature: 0.0
            }
        });

        if (!response || !response.text) {
            throw new Error("AI did not return an assignment.");
        }

        let result;

        try {
            result = JSON.parse(response.text);
        } catch (error) {
            throw new Error("AI returned invalid assignment JSON.");
        }

        if (!result.agentId || !result.reason) {
            throw new Error("AI assignment response is missing required fields.");
        }

        // IMPORTANT:
        // Make sure AI selected an agent that actually exists
        const selectedAgent = agents.find(
            agent => agent._id.toString() === result.agentId
        );

        if (!selectedAgent) {
            throw new Error("AI selected an invalid agent.");
        }

        return result;

    } catch (error) {
        console.error("AI Agent Assignment Error:", error.message);

        throw new Error(
            `Failed to assign ticket to agent: ${error.message}`
        );
    }
};