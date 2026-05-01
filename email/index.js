import "dotenv/config";
import fetch from "node-fetch";
import nodemailer from "nodemailer";
import imaps from "imap-simple";

const CHAT_URL = "https://segervolervix.space/api/chat";
const API_KEY = process.env.API_KEY;

// 🔥 Your system prompt here
const SYSTEM_PROMPT = `
You are Segervolervix AI Email Assistant.
You reply clearly, helpfully, and conversationally.
You always stay on topic and avoid unnecessary filler.
If the user asks for something impossible, explain gently.
`;

// SMTP (sending email)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// IMAP (receiving email)
const imapConfig = {
    imap: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASS,
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT),
        tls: true,
        authTimeout: 3000
    }
};

// Send reply email
async function sendEmail(to, subject, text) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
    });
}

// Handle ANY incoming email
async function handleEmail(from, body) {
    const message = body.trim();

    const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            system: SYSTEM_PROMPT,
            message
        })
    });

    const data = await res.json();
    const reply = data.reply || "AI returned no response.";

    await sendEmail(from, "Re: Your Message", reply);
}

// Start bot
async function startEmailBot() {
    const connection = await imaps.connect(imapConfig);
    await connection.openBox("INBOX");

    console.log("📨 Email bot running…");

    connection.on("mail", async () => {
        const searchCriteria = ["UNSEEN"];
        const fetchOptions = {
            bodies: ["HEADER.FIELDS (FROM)", "TEXT"],
            markSeen: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        for (const msg of messages) {
            const from = msg.parts[0].body.from[0];
            const body = msg.parts[1].body;

            await handleEmail(from, body);
        }
    });
}

startEmailBot();
