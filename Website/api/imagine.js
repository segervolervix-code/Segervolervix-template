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

const hits = new Map();

function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress
  );
}

function allowedRef(req) {
  const ref = req.headers.referer || req.headers.origin || "";
  return trusted.some(t => ref.startsWith(t));
}

function rateLimit(ip, limit, windowMs) {
  const now = Date.now();
  const data = hits.get(ip);

  if (!data) {
    hits.set(ip, { count: 1, start: now });
    return true;
  }

  if (now - data.start > windowMs) {
    hits.set(ip, { count: 1, start: now });
    return true;
  }

  data.count++;

  if (data.count > limit) return false;

  return true;
}

const IMAGE_URL =
  env.SEGERVOLERVIX_IMAGE_URL ||
  "https://segervolervix.space/api/imagine";

const API_KEY = env.SEGERVOLERVIX_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!allowedRef(req)) return res.status(403).json({ error: "Forbidden" });

  const ip = getIP(req);

  if (!rateLimit(ip, 10, 10000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  try {
    const r = await axios.post(IMAGE_URL, req.body, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": API_KEY
      }
    });

    res.status(r.status).json(r.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
