import {
    Client,
    GatewayIntentBits,
    AttachmentBuilder,
    Events
} from "discord.js";
import fetch from "node-fetch";
import "dotenv/config";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
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

// Respond when pinged
client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;

    // If the bot is mentioned
    if (msg.mentions.has(client.user)) {
        const prompt = msg.content.replace(`<@${client.user.id}>`, "").trim();
        if (!prompt) return msg.reply("Please include a message after mentioning me.");

        await msg.channel.send("💬 Thinking...");

        try {
            const res = await fetch(CHAT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify({ message: prompt })
            });

            const data = await res.json();

            if (data.reply) {
                msg.reply(`**AI:** ${data.reply}`);
            } else {
                msg.reply("❌ API returned an invalid response.");
            }
        } catch (err) {
            msg.reply("❌ Network error while contacting the AI.");
        }
    }
});

// Slash commands
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // /imagine
    if (interaction.commandName === "imagine") {
        const prompt = interaction.options.getString("prompt");

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

            interaction.editReply({ content: "🖼️ Image generated:", files: [file] });

        } catch (err) {
            interaction.editReply("❌ Failed to generate image.");
        }
    }

    // /random-question
    if (interaction.commandName === "random-question") {
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        interaction.reply(`🎲 **Random Question:**\n${q}`);
    }

    // /source-code
    if (interaction.commandName === "source-code") {
        interaction.reply("📦 Source code:\nhttps://github.com/segervolervix-code/Segervolervix-template/tree/main/discord");
    }
});

client.login(process.env.TOKEN);
