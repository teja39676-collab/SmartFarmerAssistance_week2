require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;
const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
} else {
    console.warn("GEMINI_API_KEY is missing. Chatbot requests will fail until you add it to .env");
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname)));

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "SmartFarm server is running.",
        chatbotReady: Boolean(ai)
    });
});

app.post("/api/farmer-chat", async (req, res) => {
    try {
        const { question, language, crops } = req.body;

        if (!question || typeof question !== "string" || !question.trim()) {
            return res.status(400).json({
                success: false,
                error: "Please enter a farming question."
            });
        }

        if (!ai) {
            return res.status(503).json({
                success: false,
                error: "Gemini API key is missing. Add GEMINI_API_KEY to a .env file before using the chatbot."
            });
        }

        const responseLanguage = language === "te" ? "Telugu" : "English";
        const cropData = Array.isArray(crops) ? crops : [];

        const systemInstruction = `
You are SmartFarm AI Farmer Assistant.

Your ONLY purpose is to help users with farming and agriculture-related questions.

Answer only in ${responseLanguage}, using simple farmer-friendly language.

ALLOWED TOPICS:
crop planning, crop selection, seeds, planting, crop growth, soil, irrigation,
water management, weather-related farming, fertilizers, manure, nutrients,
pests, crop diseases, weeds, harvesting, storage, post-harvest management,
farm records, agricultural markets, farm management, agricultural machinery,
greenhouse farming, organic farming, sustainable farming, crop rotation,
and general livestock/farm-animal management when directly related to farming.

STRICT OFF-TOPIC RULE:
If the user's actual question is NOT directly related to farming/agriculture,
DO NOT answer it. Reply EXACTLY:
"I can't help you with that. I can only help with farming and agriculture-related questions."

Do not answer programming, HTML, CSS, JavaScript, sports, movies, entertainment,
politics, gaming, shopping, travel, relationships, jokes, creative writing,
general technology, or other unrelated questions.

If farming words are present but the actual purpose is unrelated, treat it as off-topic.

For farming questions:
- Give practical advice.
- Use numbered steps for processes.
- Do not invent information.
- Do not invent live weather, market prices, government announcements,
  agricultural alerts, rainfall, or current crop prices.
- If live information is requested without supplied live data, say:
"I don't have live data for this information. A live API or current data source is required."
- For crop diseases, do not give a definite diagnosis from text alone.
- For serious disease or chemical issues, recommend a qualified agricultural expert.
- Do not give unsafe pesticide/chemical mixing instructions or invented application rates.

CURRENT FARMER CROP DATA:
${JSON.stringify(cropData)}

USER QUESTION:
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: systemInstruction + "\n" + question.trim(),
            config: {
                temperature: 0.2,
                maxOutputTokens: 500
            }
        });

        const answer = response.text;

        if (!answer || !answer.trim()) {
            throw new Error("Gemini returned an empty response.");
        }

        res.json({ success: true, reply: answer.trim() });
    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({
            success: false,
            error: "Gemini API request failed. Check the server, API key, model name, and internet connection."
        });
    }
});

app.listen(PORT, () => {
    console.log(`SmartFarm server running at http://localhost:${PORT}`);
});
