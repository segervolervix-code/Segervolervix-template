import moment from "moment";

/**
 * Build a system prompt for the AI model.
 *
 * @param {Object} botInfo - Telegram bot info (ctx.botInfo)
 * @param {Object} from - Telegram user object (ctx.from)
 * @param {string} messageText - User's message text
 * @param {Array<{author: string, content: string}>} history - Last 3 messages
 */
export function buildSystemPrompt(botInfo, from, messageText, history) {
    const botName = botInfo?.username || "TelegramBot";

    const userDisplay =
        [from.first_name, from.last_name].filter(Boolean).join(" ") ||
        from.username ||
        `User ${from.id}`;

    const now = moment().format("dddd, MMMM Do YYYY, HH:mm:ss");

    const lastMessages = history
        .map(h => `${h.author}: ${h.content}`)
        .join("\n");

    return `
You are ${botName}, an AI assistant inside Telegram.

Current date & time: ${now}

The user speaking is: ${userDisplay}
Their message: "${messageText}"

Last 3 messages in this conversation:
${lastMessages || "(No previous messages)"}

Respond naturally, helpfully, and concisely.
`.trim();
}
