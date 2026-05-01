(() => {
    const API_URL = "https://segervolervix.space/api/chat";

    const SYSTEM_PROMPT = `
You are Segervolervix Web Widget AI.
You reply clearly, concisely, and helpfully.
Keep responses short so they fit inside the widget.
    `;

    // Create chat bubble
    const bubble = document.createElement("div");
    bubble.innerText = "💬";
    bubble.style.position = "fixed";
    bubble.style.bottom = "20px";
    bubble.style.right = "20px";
    bubble.style.width = "60px";
    bubble.style.height = "60px";
    bubble.style.background = "#4A4AFF";
    bubble.style.color = "white";
    bubble.style.borderRadius = "50%";
    bubble.style.display = "flex";
    bubble.style.alignItems = "center";
    bubble.style.justifyContent = "center";
    bubble.style.cursor = "pointer";
    bubble.style.fontSize = "30px";
    bubble.style.zIndex = "99999";
    document.body.appendChild(bubble);

    // Create chat window
    const chat = document.createElement("div");
    chat.style.position = "fixed";
    chat.style.bottom = "100px";
    chat.style.right = "20px";
    chat.style.width = "300px";
    chat.style.height = "400px";
    chat.style.background = "white";
    chat.style.border = "1px solid #ccc";
    chat.style.borderRadius = "10px";
    chat.style.display = "none";
    chat.style.flexDirection = "column";
    chat.style.overflow = "hidden";
    chat.style.zIndex = "99999";
    document.body.appendChild(chat);

    // Chat messages area
    const messages = document.createElement("div");
    messages.style.flex = "1";
    messages.style.padding = "10px";
    messages.style.overflowY = "auto";
    chat.appendChild(messages);

    // Input box
    const input = document.createElement("input");
    input.placeholder = "Type a message...";
    input.style.border = "none";
    input.style.padding = "10px";
    input.style.width = "100%";
    input.style.boxSizing = "border-box";
    chat.appendChild(input);

    // Toggle chat
    bubble.onclick = () => {
        chat.style.display = chat.style.display === "none" ? "flex" : "none";
    };

    // Send message
    input.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter") return;

        const text = input.value.trim();
        if (!text) return;

        // Show user message
        const userMsg = document.createElement("div");
        userMsg.innerText = "You: " + text;
        userMsg.style.marginBottom = "8px";
        messages.appendChild(userMsg);

        input.value = "";

        // Call your API
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${YOUR_API_KEY_HERE}`
            },
            body: JSON.stringify({
                system: SYSTEM_PROMPT,
                message: text
            })
        });

        const data = await res.json();

        // Show AI reply
        const aiMsg = document.createElement("div");
        aiMsg.innerText = "AI: " + (data.reply || "No response");
        aiMsg.style.marginBottom = "8px";
        aiMsg.style.color = "#333";
        messages.appendChild(aiMsg);

        messages.scrollTop = messages.scrollHeight;
    });
})();
