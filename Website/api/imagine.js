export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, api_key } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Forward to your image backend
    const response = await fetch("https://segervolervix.space/api/imagine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(api_key ? { Authorization: `Bearer ${api_key}` } : {})
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    const url =
      data?.url ||
      data?.image_url ||
      data?.link ||
      null;

    return res.status(200).json({
      url
    });

  } catch (err) {
    console.error("IMAGINE ERROR:", err);
    return res.status(500).json({
      error: "Image generation failed",
      message: err.message
    });
  }
}
