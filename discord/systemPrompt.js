import moment from "moment";

/**
 * Build a system prompt for the AI model.
 *
 * @param {Client} client - The Discord client instance
 * @param {Message} message - The message that triggered the AI
 * @param {Array<{author: string, content: string}>} history - Last 3 messages
 */
export function buildSystemPrompt(client, message, history) {
    const botName = client.user.username;
    const member = message.member;
    const userName = member?.displayName || message.author.username;

    const now = moment().format("dddd, MMMM Do YYYY, HH:mm:ss");

    const lastMessages = history
        .map(h => `${h.author}: ${h.content}`)
        .join("\n");

    return `
You are ${botName}, an AI assistant inside Discord.

Current date & time: ${now}

The user speaking is: ${userName}
Their message: "${message.content}"

Last 3 messages in this conversation:
${lastMessages || "(No previous messages)"}

Respond naturally, helpfully, and concisely.
`.trim();
}
