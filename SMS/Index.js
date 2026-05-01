import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: false }));

const CHAT_URL = "https://segervolervix.space/api/chat";
const API_KEY = process.env.API_KEY;

// 🔥 System prompt
const SYSTEM_PROMPT = `
You are Segervolervix SMS AI Assistant.
You reply briefly, clearly, and helpfully.
Avoid long paragraphs because SMS has limits.
`;

// Twilio client
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

// Incoming SMS webhook
app.post("/sms", async (req, res) => {
    const from = req.body.From;
    const message = req.body.Body.trim();

    try {
        const aiRes = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                system: SYSTEM_PROMPT,
                message
            })
        });

        const data = await aiRes.json();
        const reply = data.reply || "AI returned no response.";

        // Send SMS reply
        await client.messages.create({
            body: reply,
            from: process.env.TWILIO_NUMBER,
            to: from
        });

        res.send("<Response></Response>");
    } catch (err) {
        console.error("SMS bot error:", err);
        res.send("<Response></Response>");
    }
});

app.listen(3000, () => {
    console.log("📱 SMS bot running on port 3000");
});
