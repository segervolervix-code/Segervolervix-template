export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    const response = await fetch("https://segervolervix.space/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    // Normalize response to what your frontend expects
    const reply =
      data.ai_message ||
      data.response ||
      data.message ||
      data.reply ||
      "[No response]";

    res.status(200).json({
      ai_message: reply
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      ai_message: "Proxy error: " + err.message
    });
  }
}
