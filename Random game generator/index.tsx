"use client";

import { useEffect, useRef, useState } from "react";

const CHAT_URL = "https://segervolervix.space/api/chat";
const API_KEY = "YOUR_API_KEY";

const system_prompt =
"You are nergeenolix_coder. You generate complete self-contained JavaScript code for small 3D browser games using only Canvas API and WebGL. Output ONLY runnable code.";

export default function Page() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function generateGame() {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: API_KEY
        },
        body: JSON.stringify({
          system_prompt,
          ai_model: "nergeenolix_coder",
          search_mode: false,
          user_message:
            "Create a random fully playable 3D browser game using WebGL or Canvas. Must animate and run immediately."
        })
      });

      if (!res.ok) throw new Error("API failed");

      const data = await res.json();
      const code = data.ai_message;

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
html,body{margin:0;padding:0;overflow:hidden;background:#000;}
canvas{display:block;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
try {
${code}
} catch(e) {
document.body.innerHTML = "<div style='color:white;font-family:sans-serif;padding:20px'>Runtime Error: " + e + "</div>";
}
</script>
</body>
</html>
      `;

      if (iframeRef.current) {
        iframeRef.current.srcdoc = html;
      }

      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(true);
    }
  }

  useEffect(() => {
    generateGame();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>

      <iframe
        ref={iframeRef}
        style={{ width: "100%", height: "100%", border: "none" }}
        sandbox="allow-scripts"
      />

      {loading && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.92)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
          flexDirection: "column",
          gap: "10px",
          zIndex: 9999
        }}>
          <div style={{ fontSize: "18px" }}>Generating 3D world...</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>nergeenolix_coder is building your game</div>
        </div>
      )}

      {error && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,0,0,0.95)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
          flexDirection: "column",
          gap: "12px",
          zIndex: 9999
        }}>
          <div style={{ fontSize: "18px" }}>API Error</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>
            Failed to generate game world
          </div>
          <button
            onClick={generateGame}
            style={{
              padding: "8px 14px",
              background: "#111",
              color: "#fff",
              border: "1px solid #444",
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}

      <button
        onClick={generateGame}
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 10000,
          padding: "8px 12px",
          background: "#111",
          color: "#fff",
          border: "1px solid #333",
          cursor: "pointer"
        }}
      >
        Regenerate
      </button>

    </div>
  );
}
