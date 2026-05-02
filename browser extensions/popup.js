const CHAT_URL = "https://segervolervix.space/api/chat";
const API_KEY = "YOUR_API_KEY"; // Replace this

const messagesDiv = document.getElementById("messages");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    msg.textContent = text;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    try {
        const response = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": API_KEY
            },
            body: JSON.stringify({
                ai_model: "nergeenolix",
                user_message: text
            })
        });

        const data = await response.json();

        if (data.ai_message) {
            addMessage(data.ai_message, "ai");
        } else {
            addMessage("Error: No AI response.", "ai");
        }

    } catch (err) {
        addMessage("Network error.", "ai");
    }
}
