import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

const commands = [
    new SlashCommandBuilder()
        .setName("imagine")
        .setDescription("Generate an AI image")
        .addStringOption(opt =>
            opt.setName("prompt")
               .setDescription("Describe the image you want")
               .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("random-question")
        .setDescription("Get a random interesting question"),

    new SlashCommandBuilder()
        .setName("source-code")
        .setDescription("Get the bot's source code link")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("Registering slash commands...");
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log("Commands registered.");
    } catch (err) {
        console.error("Failed to register commands:", err);
    }
})();
