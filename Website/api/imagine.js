import fs from "fs";
import path from "path";

function loadEnv(file = "keys/.env") {
  const env = {};
  const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();

    env[key] = value;
  }

  return env;
}

const ENV = loadEnv();

const IMAGE_URL =
  ENV.SEGERVOLERVIX_IMAGE_URL ||
  "https://segervolervix.space/api/imagine";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(IMAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.authorization || ""
      },
      body: JSON.stringify(req.body) // IMPORTANT: unchanged payload
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
