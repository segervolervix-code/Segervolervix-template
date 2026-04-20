/**
 * Discord Bot
 * Compatible with discord.js v14
 */

import {
    Client,
    GatewayIntentBits,
    AttachmentBuilder,
    Events,
    ChannelType,
    PermissionsBitField
} from "discord.js";

import fetch from "node-fetch";
import fs from "fs";
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
    partials: ["CHANNEL"]
});

// ==============================
// API
// ==============================

const CHAT_URL = "https://segervolervix.space/api/chat";
const IMAGE_URL = "https://segervolervix.space/api/imagine";
const API_KEY = process.env.API_KEY;

// ==============================
// CHANNEL STORAGE (AUTO CREATE)
// ==============================

const CHANNELS_FILE = "./saved-channels.json";
let activeChannels = [];

try {
    if (!fs.existsSync(CHANNELS_FILE)) {
        fs.writeFileSync(CHANNELS_FILE, JSON.stringify([], null, 2));
    }
    activeChannels = JSON.parse(fs.readFileSync(CHANNELS_FILE));
} catch (err) {
    console.error("Channel file error:", err.message);
    activeChannels = [];
}

function saveChannels() {
    try {
        fs.writeFileSync(CHANNELS_FILE, JSON.stringify(activeChannels, null, 2));
    } catch (err) {
        console.error("Save error:", err.message);
    }
}

// ==============================
// SWEAR FILTER (AI ONLY)
// ==============================

const SWEAR_WORDS = ["fuck", "shit", "bitch", "asshole"];

// ==============================
// RANDOM QUESTIONS
// ==============================

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

    addToHistory(msg);

    // Activated channel = respond to everything
    if (activeChannels.includes(msg.channel.id)) {
        return handleChat(msg, msg.content);
    }

    // Mention only
    if (!msg.mentions.has(client.user)) return;

    const prompt = msg.content
        .replace(new RegExp(`<@!?${client.user.id}>`), "")
        .trim();

    if (!prompt) {
        return msg.reply("Error");
    }

    return handleChat(msg, prompt);
});

//
// ─────────────────────────────────────────────
//   DM AUTO-CHAT SUPPORT
// ─────────────────────────────────────────────
//
client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    if (msg.channel.type !== ChannelType.DM) return;

    const text = msg.content.trim();
    if (!text) return;

    addToHistory(msg);

    return handleChat(msg, text);
});

//
// ─────────────────────────────────────────────
//   CHAT HANDLER (TYPING + FILTERS)
// ─────────────────────────────────────────────
//
async function handleChat(msg, text) {
    const history = getHistoryForChannel(msg.channel.id);
    const systemPrompt = buildSystemPrompt(client, msg, history);

    try {
        // Typing indicator instead of "Thinking..."
        await msg.channel.sendTyping();

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

        let data;
        try {
            data = await res.json();
        } catch (err) {
            console.error("JSON error:", err.message);
            return msg.reply("Error");
        }

        if (!data.reply) {
            console.error("Bad response:", data);
            return msg.reply("Error");
        }

        let reply = data.reply;

        // Redact mass mentions
        reply = reply
            .replace(/@everyone/g, "(Redacted)")
            .replace(/@here/g, "(Redacted)");

        // AI-only swear filter
        const lower = reply.toLowerCase();
        if (SWEAR_WORDS.some(w => lower.includes(w))) {
            reply = "⚠️ Response blocked due to inappropriate content.";
        }

        await msg.reply(`**AI:** ${reply}`);

    } catch (err) {
        console.error("Chat error:", err.message);
        await msg.reply("Error");
    }
}

//
// ─────────────────────────────────────────────
//   SLASH COMMANDS
// ─────────────────────────────────────────────
//
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // /activate
    if (interaction.commandName === "activate") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "Error", ephemeral: true });
        }

        if (!activeChannels.includes(interaction.channel.id)) {
            activeChannels.push(interaction.channel.id);
            saveChannels();
        }

        await interaction.reply("Activated.");
    }

    // /deactivate
    if (interaction.commandName === "deactivate") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "Error", ephemeral: true });
        }

        activeChannels = activeChannels.filter(id => id !== interaction.channel.id);
        saveChannels();

        await interaction.reply("Deactivated.");
    }

    // /imagine (unchanged except error handling)
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

            let data;
            try {
                data = await res.json();
            } catch (err) {
                console.error("Image JSON error:", err.message);
                return interaction.editReply("Error");
            }

            if (!data.link) {
                console.error("No link:", data);
                return interaction.editReply("Error");
            }

            const imgRes = await fetch(data.link);
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const file = new AttachmentBuilder(buffer, { name: "image.png" });

            await interaction.editReply({
                content: "🖼️ Image generated:",
                files: [file]
            });

        } catch (err) {
            console.error("Image error:", err.message);
            await interaction.editReply("Error");
        }
    }

    // /random-question (unchanged)
    if (interaction.commandName === "random-question") {
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        await interaction.reply(`🎲 **Random Question:**\n${q}`);
    }

    // /source-code (unchanged)
    if (interaction.commandName === "source-code") {
        await interaction.reply(
            "📦 Source code:\nhttps://github.com/segervolervix-code/Segervolervix-template/tree/main/discord"
        );
    }
});

client.login(process.env.TOKEN);
