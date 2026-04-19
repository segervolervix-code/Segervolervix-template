import {
    Client,
    GatewayIntentBits,
    AttachmentBuilder,
    Events
} from "discord.js";
import fetch from "node-fetch";
import "dotenv/config";

import { buildSystemPrompt } from "./systemPrompt.js";
import { addToHistory, getHistoryForChannel } from "./history.js";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ["CHANNEL"] // Needed for DMs
});

// API endpoints
const CHAT_URL = "https://segervolervix.space/api/chat";
const IMAGE_URL = "https://segervolervix.space/api/imagine";
const API_KEY = process.env.API_KEY;

// Random questions
const QUESTIONS = [
    "If you could learn any skill instantly, what would it be?",
    "What’s a technology you think will change the world soon?",
    "If you could visit any fictional universe, where would you go?",
    "What’s something you think everyone should try at least once?",
    "If you could talk to your future self, what would you ask?"
];

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
});

//
// ─────────────────────────────────────────────
//   MENTION-BASED CHAT
// ─────────────────────────────────────────────
//
client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    // Track history for all messages
    addToHistory(msg);

    // Only respond if bot is mentioned
    if (!msg.mentions.has(client.user)) return;

    const prompt = msg.content.replace(`<@${client.user.id}>`, "").trim();
    if (!prompt) {
        return msg.reply("Please include a message after mentioning me.");
    }

    const history = getHistoryForChannel(msg.channel.id);
    const systemPrompt = buildSystemPrompt(client, msg, history);

    const thinkingMsg = await msg.channel.send("💬 Thinking...");

    try {
        const res = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                system: systemPrompt,
                message: prompt
            })
        });

        const data = await res.json();

        if (data.reply) {
            await thinkingMsg.delete().catch(() => {});
            await msg.reply(`**AI:** ${data.reply}`);
        } else {
            await thinkingMsg.edit("❌ API returned an invalid response.");
        }
    } catch (err) {
        console.error("Chat API error:", err);
        await thinkingMsg.edit("❌ Network error while contacting the AI.");
    }
});

//
// ─────────────────────────────────────────────
//   DM AUTO-CHAT SUPPORT
// ─────────────────────────────────────────────
//
client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    // Only trigger in DMs
    if (msg.channel.type !== 1) return; // 1 = DMChannel

    const text = msg.content.trim();
    if (!text) return;

    addToHistory(msg);
    const history = getHistoryForChannel(msg.channel.id);

    const systemPrompt = buildSystemPrompt(client, msg, history);

    const thinking = await msg.channel.send("💬 Thinking...");

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
            await thinking.edit(`**AI:** ${data.reply}`);
        } else {
            await thinking.edit("❌ API returned an invalid response.");
        }
    } catch (err) {
        console.error("DM Chat API error:", err);
        await thinking.edit("❌ Network error while contacting the AI.");
    }
});

//
// ─────────────────────────────────────────────
//   SLASH COMMANDS
// ─────────────────────────────────────────────
//
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    //
    // /imagine
    //
    if (interaction.commandName === "imagine") {
        const prompt = interaction.options.getString("prompt", true);

        await interaction.reply("🎨 Generating image...");

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
                return interaction.editReply("❌ No image link returned.");
            }

            const imgRes = await fetch(data.link);
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const file = new AttachmentBuilder(buffer, { name: "image.png" });

            await interaction.editReply({ content: "🖼️ Image generated:", files: [file] });
        } catch (err) {
            console.error("Image API error:", err);
            await interaction.editReply("❌ Failed to generate image.");
        }
    }

    //
    // /random-question
    //
    if (interaction.commandName === "random-question") {
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        await interaction.reply(`🎲 **Random Question:**\n${q}`);
    }

    //
    // /source-code
    //
    if (interaction.commandName === "source-code") {
        await interaction.reply(
            "📦 Source code:\nhttps://github.com/segervolervix-code/Segervolervix-template/tree/main/discord"
        );
    }
});

client.login(process.env.TOKEN);
