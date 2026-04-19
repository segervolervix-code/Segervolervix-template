// Simple per-chat history of last 3 messages

const historyMap = new Map(); // chatId -> [{ author, content }]

export function addToHistory(ctx) {
    const chatId = ctx.chat.id;

    if (!historyMap.has(chatId)) {
        historyMap.set(chatId, []);
    }

    const arr = historyMap.get(chatId);

    const from = ctx.from;
    const author =
        [from.first_name, from.last_name].filter(Boolean).join(" ") ||
        from.username ||
        `User ${from.id}`;

    arr.push({
        author,
        content: ctx.message?.text || ""
    });

    if (arr.length > 3) arr.shift(); // keep last 3
}

export function getHistoryForChat(chatId) {
    return historyMap.get(chatId) || [];
}
