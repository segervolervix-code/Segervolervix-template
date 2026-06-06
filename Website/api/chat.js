import fs from "fs";
import path from "path";
import axios from "axios";

function loadEnv(file = "keys/.env") {
  const env = {};
  const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

  for (const line of content.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }

  return env;
}

const ENV = loadEnv();

const CHAT_URL =
  ENV.SEGERVOLERVIX_CHAT_URL ||
  "https://segervolervix.space/api/chat";

const API_KEY = ENV.SEGERVOLERVIX_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const r = await axios.post(CHAT_URL, req.body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      }
    });

    res.status(r.status).json(r.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
