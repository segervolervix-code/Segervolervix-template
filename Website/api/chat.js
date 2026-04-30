export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      user_message,
      ai_model,
      fallback_model,
      system_prompt,
      search_mode,
      history,
      api_key
    } = req.body || {};

    if (!user_message) {
      return res.status(400).json({ error: "Missing user_message" });
    }

    // Model selection (frontend controls this)
    const model = ai_model || fallback_model || "llama-3.3-70b-instruct";

    // Build messages exactly as your UI expects
    const messages = [];

    if (system_prompt) {
      messages.push({
        role: "system",
        content: system_prompt
      });
    }

    if (Array.isArray(history)) {
      for (const m of history) {
        if (m?.role && m?.content) {
          messages.push({
            role: m.role,
            content: m.content
          });
        }
      }
    }

    messages.push({
      role: "user",
      content: user_message
    });

    // SEARCH MODE (your frontend triggers this)
    if (search_mode) {
      return res.status(200).json({
        ai_message:
          `🔎 Search Mode Enabled\n\nQuery: ${user_message}\n\n(No external search provider connected yet)`
      });
    }

    // Forward request to your backend (Segervolervix)
    const response = await fetch("https://segervolervix.space/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(api_key ? { Authorization: `Bearer ${api_key}` } : {})
      },
      body: JSON.stringify({
        model,
        messages,
        search_mode
      })
    });

    const data = await response.json();

    const reply =
      data?.ai_message ||
      data?.response ||
      data?.message ||
      data?.reply ||
      "[No response]";

    return res.status(200).json({
      ai_message: reply
    });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({
      ai_message: "Server error: " + err.message
    });
  }
}
