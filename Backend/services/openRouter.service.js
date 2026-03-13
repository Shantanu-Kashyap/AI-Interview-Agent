
import axios from "axios";



export const askAI = async (messages) => {
    try {
        if(!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error("Messages should be a non-empty array");
        }
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error("OPENROUTER_API_KEY is missing in environment variables");
        }

        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "openai/gpt-4o-mini",
            messages: messages
            
        }, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            timeout: 20000,
        })
        const content = response.data.choices[0].message?.content;
        if(!content || !content.trim()) {
            throw new Error("AI response is empty or contains only whitespace");
        }
        return content;
    } catch (error) {
        const status = error?.response?.status;
        const providerMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
        const message = providerMessage || error.message || "Unknown AI service error";
        console.error("Error in askAI:", status ? `[${status}] ${message}` : message);
        throw new Error(status ? `AI service error (${status}): ${message}` : message);
    }
}

