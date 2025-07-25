import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const greetings = ["hi","ok", "hello", "thanks", "how are you", "hey", "good morning", "good evening"];
const hrmsKeywords = [
    "leave", "name", "announcement", "holiday", "attendance", "payroll", "HR", "employee",
    "profile", "department", "division", "grade", "job title", "designation", "role",
    "function", "section", "shift", "branch", "location", "workplace", "joining date",
    "doj", "nationality", "gender", "marital status", "manager", "experience",
    "language", "email", "phone", "contact", "employee id", "emp id", "salary",
    "allowance", "bank", "account", "personal info", "company info", "my info", "blood group"
];

const greetingPrompt = `You are a friendly assistant. Respond warmly and politely to the user's greeting in a single sentence.`;

const hrmsPrompt = `You are a helpful assistant. Answer the user's HRMS-related queries politely and concisely.`;

const chatHistory = [];

function updateChatHistory(userMessage, botResponse) {
    const trimmedUserMessage = userMessage.slice(0, 100);
    const trimmedBotResponse = botResponse.slice(0, 100);
    chatHistory.push({ user: trimmedUserMessage, bot: trimmedBotResponse });

    if (chatHistory.length > 6) {
        chatHistory.shift(); 
    }
}

async function getOpenAIResponse(userMessage) {
    const isGreeting = greetings.some(greeting => userMessage.toLowerCase().includes(greeting));
    if (isGreeting) {
        const messages = [
            { role: "system", content: greetingPrompt },
            ...chatHistory.map(chat => [
                { role: "user", content: chat.user },
                { role: "assistant", content: chat.bot }
            ]).flat(),
            { role: "user", content: userMessage },
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages,
        });

        const botResponse = response.choices[0].message.content;
        updateChatHistory(userMessage, botResponse); // Update chat history
        return botResponse;
    }

    const isHRMSQuery = hrmsKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    if (!isHRMSQuery) {
        const botResponse = "I'm sorry, but I can only assist with HRMS-related queries.";
        updateChatHistory(userMessage, botResponse); // Update chat history
        return botResponse;
    }

    const messages = [
        { role: "system", content: hrmsPrompt },
        ...chatHistory.map(chat => [
            { role: "user", content: chat.user },
            { role: "assistant", content: chat.bot }
        ]).flat(),
        { role: "user", content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
    });

    const botResponse = completion.choices[0].message.content;
    updateChatHistory(userMessage, botResponse); // Update chat history
    return botResponse;
}

export { getOpenAIResponse, chatHistory };
