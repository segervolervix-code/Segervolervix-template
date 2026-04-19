// index.js - Single-file Slack bot with chat, imagine, random-question, source-code, mentions, history, system prompt

import { App } from "@slack/bolt";
import fetch from "node-fetch";
import moment from "moment";
import "dotenv/config";

// ENV:
// SLACK_BOT_TOKEN=...
// SLACK_SIGNING_SECRET=...
// SLACK_APP_TOKEN=... (for Socket Mode)
// API_KEY=...

const CHAT_URL = "https://segervolervix.space/api/chat";
const IMAGE_URL = "https://segervolervix.space/api/imagine";
const API_KEY = process.env.API_KEY;

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});

// ── Simple in-memory history: last 3 messages per channel ─────────────────────

const historyMap = new Map(); // channelId -> [{ author, content }]

function addToHistory(channelId, author, content) {
    if (!historyMap.has(channelId)) {
        historyMap.set(channelId, []);
    }
    const arr = historyMap.get(channelId);
    arr.push({ author, content });
    if (arr.length > 3) arr.shift();
}

function getHistory(channelId) {
    return historyMap.get(channelId) || [];
}

// ── System prompt builder ─────────────────────────────────────────────────────

let botName = "SlackBot";

async function initBotName() {
    try {
        const auth = await app.client.auth.test({
            token: process.env.SLACK_BOT_TOKEN
        });
        botName = auth.user || "SlackBot";
    } catch (e) {
        console.error("Failed to fetch bot name:", e);
    }
}

function buildSystemPrompt(userDisplay, messageText, history) {
    const now = moment().format("dddd, MMMM Do YYYY, HH:mm:ss");

    const lastMessages = history
        .map(h => `${h.author}: ${h.content}`)
        .join("\n");

    return `
You are ${botName}, an AI assistant inside Slack.

Current date & time: ${now}

The user speaking is: ${userDisplay}
Their message: "${messageText}"

Last 3 messages in this conversation:
${lastMessages || "(No previous messages)"}

Respond naturally, helpfully, and concisely.
`.trim();
}

// Helper to get user display name
async function getUserDisplayName(userId) {
    try {
        const res = await app.client.users.info({
            token: process.env.SLACK_BOT_TOKEN,
            user: userId
        });
        const u = res.user;
        return (
            u.profile?.display_name ||
            u.profile?.real_name ||
            u.name ||
            userId
        );
    } catch {
        return userId;
    }
}

// Random questions
const QUESTIONS = [
    "If you could learn any skill instantly, what would it be?",
    "What’s a technology you think will change the world soon?",
    "If you could visit any fictional universe, where would you go?",
    "What’s something you think everyone should try at least once?",
    "If you could talk to your future self, what would you ask?"
];

// ── Slash command: /chat ──────────────────────────────────────────────────────

app.command("/chat", async ({ command, ack, respond }) => {
    await ack();

    const channelId = command.channel_id;
    const userId = command.user_id;
    const text = command.text?.trim() || "";

    if (!text) {
        return respond("Please provide a message after `/chat`.");
    }

    const userDisplay = await getUserDisplayName(userId);

    addToHistory(channelId, userDisplay, text);
    const history = getHistory(channelId);
    const systemPrompt = buildSystemPrompt(userDisplay, text, history);

    const thinking = await respond("💬 Thinking...");

    try {
        const res = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                system: systemPrompt,
                message: text
            })
        });

        const data = await res.json();

        if (data.reply) {
            await app.client.chat.update({
                token: process.env.SLACK_BOT_TOKEN,
                channel: thinking.channel,
                ts: thinking.ts,
                text: `*AI:* ${data.reply}`
            });
        } else {
            await app.client.chat.update({
                token: process.env.SLACK_BOT_TOKEN,
                channel: thinking.channel,
                ts: thinking.ts,
                text: "❌ API returned an invalid response."
            });
        }
    } catch (err) {
        console.error("Chat API error:", err);
        await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: thinking.channel,
            ts: thinking.ts,
            text: "❌ Network error while contacting the AI."
        });
    }
});

// ── Slash command: /imagine ───────────────────────────────────────────────────

app.command("/imagine", async ({ command, ack, respond }) => {
    await ack();

    const prompt = command.text?.trim() || "";
    if (!prompt) {
        return respond("Please provide a prompt after `/imagine`.");
    }

    const status = await respond("🎨 Generating image...");

    try {
        const res = await fetch(IMAGE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ prompt })
        });

        const data = await res.json();

        if (!data.link) {
            return app.client.chat.update({
                token: process.env.SLACK_BOT_TOKEN,
                channel: status.channel,
                ts: status.ts,
                text: "❌ No image link returned."
            });
        }

        await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: status.channel,
            ts: status.ts,
            text: "🖼️ Image generated:",
            attachments: [
                {
                    image_url: data.link,
                    alt_text: "Generated image"
                }
            ]
        });
    } catch (err) {
        console.error("Image API error:", err);
        await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: status.channel,
            ts: status.ts,
            text: "❌ Failed to generate image."
        });
    }
});

// ── Slash command: /random-question ───────────────────────────────────────────

app.command("/random-question", async ({ ack, respond }) => {
    await ack();
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    await respond(`🎲 *Random Question:*\n${q}`);
});

// ── Slash command: /source-code ───────────────────────────────────────────────

app.command("/source-code", async ({ ack, respond }) => {
    await ack();
    await respond(
        "📦 Source code:\nhttps://github.com/segervolervix-code/Segervolervix-template/tree/main/discord"
    );
});

// ── Mention-based chat: @Bot message ──────────────────────────────────────────

app.event("app_mention", async ({ event, say }) => {
    const channelId = event.channel;
    const userId = event.user;
    const rawText = event.text || "";

    const text = rawText.replace(/<@[^>]+>/g, "").trim();
    if (!text) {
        return say("Please include a message after mentioning me.");
    }

    const userDisplay = await getUserDisplayName(userId);

    addToHistory(channelId, userDisplay, text);
    const history = getHistory(channelId);
    const systemPrompt = buildSystemPrompt(userDisplay, text, history);

    const thinking = await say("💬 Thinking...");

    try {
        const res = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                system: systemPrompt,
                message: text
            })
        });

        const data = await res.json();

        if (data.reply) {
            await app.client.chat.update({
                token: process.env.SLACK_BOT_TOKEN,
                channel: thinking.channel,
                ts: thinking.ts,
                text: `*AI:* ${data.reply}`
            });
        } else {
            await app.client.chat.update({
                token: process.env.SLACK_BOT_TOKEN,
                channel: thinking.channel,
                ts: thinking.ts,
                text: "❌ API returned an invalid response."
            });
        }
    } catch (err) {
        console.error("Mention Chat API error:", err);
        await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: thinking.channel,
            ts: thinking.ts,
            text: "❌ Network error while contacting the AI."
        });
    }
});

// ── Optional: auto-chat in DMs (no slash, just text) ──────────────────────────

app.event("message", async ({ event, context }) => {
    // Ignore bot messages and threads and channels; only DMs
    if (event.subtype) return;
    if (event.channel_type !== "im") return;

    const text = (event.text || "").trim();
    if (!text || text.startsWith("/")) return;

    const channelId = event.channel;
    const userId = event.user;

    const userDisplay = await getUserDisplayName(userId);

    addToHistory(channelId, userDisplay, text);
    const history = getHistory(channelId);
    const systemPrompt = buildSystemPrompt(userDisplay, text, history);

    const thinking = await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: channelId,
        text: "💬 Thinking..."
    });

    try {
        const res = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                system: systemPrompt,
                message: text
            })
        });

        const data = await res.json();

        if (data.reply) {
            await app.client.chat.update({
                token: process.env.SLACK_BOT_TOKEN,
                channel: thinking.channel,
                ts: thinking.ts,
                text: `*AI:* ${data.reply}`
            });
        } else {
            await app.client.chat.update({
                token: process.env.SLACK_BOT_TOKEN,
                channel: thinking.channel,
                ts: thinking.ts,
                text: "❌ API returned an invalid response."
            });
        }
    } catch (err) {
        console.error("DM Chat API error:", err);
        await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: thinking.channel,
            ts: thinking.ts,
            text: "❌ Network error while contacting the AI."
        });
    }
});

// ── Start app ─────────────────────────────────────────────────────────────────

(async () => {
    await initBotName();
    await app.start(process.env.PORT || 3000);
    console.log("Slack bot is running.");
})();
