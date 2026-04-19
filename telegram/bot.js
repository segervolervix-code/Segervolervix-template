import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import "dotenv/config";
import { buildSystemPrompt } from "./systemPrompt.js";
import { addToHistory, getHistoryForChat } from "./history.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_KEY = process.env.API_KEY;

if (!BOT_TOKEN) {
    console.error("Missing TELEGRAM_BOT_TOKEN in .env");
    process.exit(1);
}

const CHAT_URL = "https://segervolervix.space/api/chat";
const IMAGE_URL = "https://segervolervix.space/api/imagine";

const bot = new Telegraf(BOT_TOKEN);

// Random questions
const QUESTIONS = [
    "If you could learn any skill instantly, what would it be?",
    "What’s a technology you think will change the world soon?",
    "If you could visit any fictional universe, where would you go?",
    "What’s something you think everyone should try at least once?",
    "If you could talk to your future self, what would you ask?"
];

bot.start(async (ctx) => {
    await ctx.reply(
        "Welcome to Segervolervix on Telegram.\n\nCommands:\n/chat <message>\n/imagine <prompt>\n/random_question\n/source_code"
    );
});

// /chat command
bot.command("chat", async (ctx) => {
    const text = ctx.message.text.replace(/^\/chat(@\S+)?\s*/, "").trim();
    if (!text) {
        return ctx.reply("Please provide a message after /chat.");
    }

    addToHistory(ctx);
    const history = getHistoryForChat(ctx.chat.id);
    const systemPrompt = buildSystemPrompt(bot.botInfo, ctx.from, text, history);

    const thinkingMsg = await ctx.reply("💬 Thinking...");

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
            await ctx.telegram.editMessageText(
                thinkingMsg.chat.id,
                thinkingMsg.message_id,
                undefined,
                `**AI:** ${data.reply}`,
                { parse_mode: "Markdown" }
            );
        } else {
            await ctx.telegram.editMessageText(
                thinkingMsg.chat.id,
                thinkingMsg.message_id,
                undefined,
                "❌ API returned an invalid response."
            );
        }
    } catch (err) {
        console.error("Chat API error:", err);
        await ctx.telegram.editMessageText(
            thinkingMsg.chat.id,
            thinkingMsg.message_id,
            undefined,
            "❌ Network error while contacting the AI."
        );
    }
});

// /imagine command
bot.command("imagine", async (ctx) => {
    const prompt = ctx.message.text.replace(/^\/imagine(@\S+)?\s*/, "").trim();
    if (!prompt) {
        return ctx.reply("Please provide a prompt after /imagine.");
    }

    const status = await ctx.reply("🎨 Generating image...");

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
            return ctx.telegram.editMessageText(
                status.chat.id,
                status.message_id,
                undefined,
                "❌ No image link returned."
            );
        }

        await ctx.telegram.deleteMessage(status.chat.id, status.message_id);
        await ctx.replyWithPhoto({ url: data.link }, { caption: "🖼️ Image generated." });
    } catch (err) {
        console.error("Image API error:", err);
        await ctx.telegram.editMessageText(
            status.chat.id,
            status.message_id,
            undefined,
            "❌ Failed to generate image."
        );
    }
});

// /random_question
bot.command("random_question", async (ctx) => {
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    await ctx.reply(`🎲 Random Question:\n${q}`);
});

// /source_code
bot.command("source_code", async (ctx) => {
    await ctx.reply(
        "📦 Source code:\nhttps://github.com/segervolervix-code/Segervolervix-template/tree/main/discord"
    );
});

// Optional: treat plain text (no command) as chat in DMs
bot.on("text", async (ctx) => {
    // Ignore if it's already a command
    if (ctx.message.text.startsWith("/")) return;
    if (ctx.chat.type !== "private") return; // only auto-chat in DMs

    const text = ctx.message.text.trim();
    if (!text) return;

    addToHistory(ctx);
    const history = getHistoryForChat(ctx.chat.id);
    const systemPrompt = buildSystemPrompt(bot.botInfo, ctx.from, text, history);

    const thinkingMsg = await ctx.reply("💬 Thinking...");

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
            await ctx.telegram.editMessageText(
                thinkingMsg.chat.id,
                thinkingMsg.message_id,
                undefined,
                `**AI:** ${data.reply}`,
                { parse_mode: "Markdown" }
            );
        } else {
            await ctx.telegram.editMessageText(
                thinkingMsg.chat.id,
                thinkingMsg.message_id,
                undefined,
                "❌ API returned an invalid response."
            );
        }
    } catch (err) {
        console.error("Chat API error:", err);
        await ctx.telegram.editMessageText(
            thinkingMsg.chat.id,
            thinkingMsg.message_id,
            undefined,
            "❌ Network error while contacting the AI."
        );
    }
});

bot.launch().then(() => {
    console.log("Telegram bot started.");
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
