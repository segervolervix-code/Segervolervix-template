// Simple per-channel history of last 3 messages

const historyMap = new Map(); // channelId -> [{ author, content }]

export function addToHistory(message) {
    const channelId = message.channel.id;

    if (!historyMap.has(channelId)) {
        historyMap.set(channelId, []);
    }

    const arr = historyMap.get(channelId);

    arr.push({
        author: message.author.username,
        content: message.content
    });

    if (arr.length > 3) arr.shift(); // keep last 3
}

export function getHistoryForChannel(channelId) {
    return historyMap.get(channelId) || [];
}
