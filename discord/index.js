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
// MESSAGE COUNTER
// ==============================

const MESSAGE_COUNT_FILE = "./messagecount.txt";

if (!fs.existsSync(MESSAGE_COUNT_FILE)) {
    fs.writeFileSync(MESSAGE_COUNT_FILE, "0");
}

function incrementMessageCount() {
    try {
        let count = parseInt(fs.readFileSync(MESSAGE_COUNT_FILE, "utf8"));
        if (isNaN(count)) count = 0;
        count++;
        fs.writeFileSync(MESSAGE_COUNT_FILE, count.toString());
    } catch (err) {
        console.error("Message count error:", err.message);
    }
}

// ==============================
// SWEAR FILTER (AI ONLY)
// ==============================

const SWEAR_WORDS = ["fuck", "shit", "bitch", "asshole", "porn", "pubic", "penis"];

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

// ─────────────────────────────
// MESSAGE HANDLING
// ─────────────────────────────

client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    addToHistory(msg);

    if (activeChannels.includes(msg.channel.id)) {
        return handleChat(msg, msg.content);
    }

    if (!msg.mentions.has(client.user)) return;

    const prompt = msg.content
        .replace(new RegExp(`<@!?${client.user.id}>`), "")
        .trim();

    if (!prompt) return msg.reply("Error");

    return handleChat(msg, prompt);
});

client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;
    if (msg.channel.type !== ChannelType.DM) return;

    const text = msg.content.trim();
    if (!text) return;

    addToHistory(msg);
    return handleChat(msg, text);
});

// ─────────────────────────────
// CHAT HANDLER
// ─────────────────────────────

async function handleChat(msg, text) {
    const history = getHistoryForChannel(msg.channel.id);
    const systemPrompt = buildSystemPrompt(client, msg, history);

    try {
        await msg.channel.sendTyping();

        const res = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${API_KEY}`
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
            return msg.reply("Error");
        }

        if (!data.reply) return msg.reply("Error");

        let reply = data.reply;

        reply = reply
            .replace(/@everyone/g, "(Redacted)")
            .replace(/@here/g, "(Redacted)");

        const lower = reply.toLowerCase();
        if (SWEAR_WORDS.some(w => lower.includes(w))) {
            reply = "⚠️ Response blocked due to inappropriate content.";
        }

        const prefix = "**AI:** ";
        const maxLength = 2000 - prefix.length;

        if (reply.length > maxLength) {
            reply = reply.slice(0, maxLength - 3) + "...";
        }

        await msg.reply(`${prefix}${reply}`);
        incrementMessageCount();

    } catch (err) {
        console.error("Chat error:", err.message);
        await msg.reply("Error");
    }
}

// ─────────────────────────────
// SLASH COMMANDS
// ─────────────────────────────

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "activate") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "Error", ephemeral: true });
        }

        if (!activeChannels.includes(interaction.channel.id)) {
            activeChannels.push(interaction.channel.id);
            saveChannels();
        }

        await interaction.reply("Activated.");
        incrementMessageCount();
    }

    if (interaction.commandName === "deactivate") {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "Error", ephemeral: true });
        }

        activeChannels = activeChannels.filter(id => id !== interaction.channel.id);
        saveChannels();

        await interaction.reply("Deactivated.");
        incrementMessageCount();
    }

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
            const imgRes = await fetch(data.link);
            const buffer = Buffer.from(await imgRes.arrayBuffer());

            const file = new AttachmentBuilder(buffer, { name: "image.png" });

            await interaction.editReply({
                content: "🖼️ Image generated:",
                files: [file]
            });

            incrementMessageCount();

        } catch (err) {
            await interaction.editReply("Error");
        }
    }

    if (interaction.commandName === "random-question") {
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        await interaction.reply(`🎲 **Random Question:**\n${q}`);
        incrementMessageCount();
    }

    if (interaction.commandName === "source-code") {
        await interaction.reply(
            "📦 Source code:\nhttps://github.com/segervolervix-code/Segervolervix-template/tree/main/discord"
        );
        incrementMessageCount();
    }
});

client.login(process.env.TOKEN);
