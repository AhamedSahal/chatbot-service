
import OpenAI from "openai";
import dotenv from "dotenv";
import { db } from "../../db.js";
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const greetings = ["hi","ok", "hello", "thanks", "how are you", "hey", "good morning", "good evening"];
const hrmsKeywords = [
    "leave", "name", "announcement","regularization", "holiday", "attendance", "payroll", "HR", "employee",
    "profile", "department", "division", "grade", "job title", "designation", "role",
    "function", "section", "shift", "branch", "location", "workplace", "joining date",
    "doj", "nationality", "gender", "marital status", "manager", "experience",
    "language", "email", "phone", "contact", "employee id", "emp id", "salary",
    "allowance", "bank", "account", "personal info", "company info", "my info", "blood group"
];

const greetingPrompt = `You are a friendly assistant. Respond warmly and politely to the user's greeting in a single sentence.`;

const hrmsPrompt = `You are a helpful assistant. Answer the user's HRMS-related queries politely and concisely. For any date, use the format DD-MMM-YYYY. If the query is not related to HRMS, politely inform the user that you can only assist with HRMS-related queries.`;


// Save chat to MySQL
async function saveChatToDB({ employeeId, companyId, userMessage, aiResponse }) {
    try {
        await db.query(
            `INSERT INTO chat_logs (employee_id, company_id, user_message, ai_response, timestamp) VALUES (?, ?, ?, ?, NOW())`,
            [employeeId, companyId, userMessage, aiResponse]
        );
    } catch (err) {
        console.error("Failed to save chat log:", err);
    }
}

// Main function now accepts employeeId and companyId
async function getOpenAIResponse(userMessage, employeeId, companyId) {
    const isGreeting = greetings.some(greeting => userMessage.toLowerCase().includes(greeting));
    let aiResponse;

    if (isGreeting) {
        const messages = [
            { role: "system", content: greetingPrompt },
            { role: "user", content: userMessage },
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages,
        });

        aiResponse = response.choices[0].message.content;
    } else {
        const isHRMSQuery = hrmsKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
        if (!isHRMSQuery) {
            aiResponse = "I'm sorry, but I can only assist with HRMS-related queries.";
        } else {
            const messages = [
                { role: "system", content: hrmsPrompt },
                { role: "user", content: userMessage },
            ];

            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages,
            });

            aiResponse = completion.choices[0].message.content;
        }
    }

    // Save chat to DB
    // await saveChatToDB({ employeeId, companyId, userMessage, aiResponse });

    return aiResponse;
}

export { getOpenAIResponse };
