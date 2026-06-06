import fs from "fs";
import path from "path";
import axios from "axios";

const env = Object.fromEntries(
  fs.readFileSync(path.resolve("keys/.env"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const trusted = fs.readFileSync(path.resolve("trustedurls.txt"), "utf8")
  .split("\n")
  .map(s => s.trim())
  .filter(Boolean);

const rate = new Map();

const IMAGE_URL =
  env.SEGERVOLERVIX_IMAGE_URL ||
  "https://segervolervix.space/api/imagine";

const API_KEY = env.SEGERVOLERVIX_API_KEY;

function getIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
         req.socket?.remoteAddress;
}

function allowedRef(req) {
  const ref = req.headers.referer || req.headers.origin || "";
  return trusted.some(t => ref.startsWith(t));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = getIP(req);
  const now = Date.now();

  const r = rate.get(ip);
  if (r && now < r) {
    return res.status(429).json({ error: "Rate limited" });
  }

  if (!allowedRef(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const r2 = await axios.post(IMAGE_URL, req.body, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": API_KEY
      }
    });

    rate.set(ip, now + 60000);

    res.status(r2.status).json(r2.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
