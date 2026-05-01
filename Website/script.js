<script>
const CHAT_URL = "https://segervolervix.space/api/chat";
const IMAGE_URL = "https://segervolervix.space/api/imagine";
const API_KEY = "YOUR_API_KEY";
const FALLBACK_MODEL = "llama-3.3-70b-instruct";
const LS_KEY = "nergeai_history";

const SYSTEM_PROMPT = `You are NergeAI, a capable AI assistant hosted on the Segervolervix platform (segervolervix.space) — an AI lab built by Legendarymasterpro, focused on Discord-first AI development.

You are helpful, concise, and intelligent. You assist with coding, writing, research, and general questions.

You have two special abilities. When you need them, include one of these commands on its own line in your reply:

search_web("your query here") — searches the web for current or real-time information.
imagine_prompt("your description here") — generates an image from a text description.

Use search_web when the user asks about recent events, current facts, or anything you are uncertain about. Use imagine_prompt when the user requests an image or visual. You decide when to use these — the user does not control them. Use only one command per reply if needed.`;

const PP_HTML = `<h3>Privacy Policy</h3><p>Last updated: 2026</p><p>NergeAI is powered by the Segervolervix platform. We are committed to protecting your privacy.</p><h3>Data We Collect</h3><p>Messages are processed to generate responses. Chat history is saved locally in your browser via localStorage and is never sent to external servers beyond the Segervolervix API.</p><h3>API Keys</h3><p>All AI responses are processed by Segervolervix infrastructure. By using this service you agree to their data handling practices.</p><h3>Cookies</h3><p>This application does not use tracking cookies.</p><h3>Contact</h3><p>Visit segervolervix.space or join the Discord server for any privacy concerns.</p>`;
const TOS_HTML = `<h3>Terms of Service</h3><p>Last updated: 2026</p><p>By using NergeAI, you agree to the following terms.</p><h3>Acceptable Use</h3><p>You may not use this service to generate harmful, illegal, or abusive content. Misuse will result in access being revoked.</p><h3>Accuracy</h3><p>AI responses may contain errors. Do not rely solely on this service for medical, legal, financial, or safety-critical decisions.</p><h3>Image Generation</h3><p>Images must not depict illegal content. You are responsible for all prompts submitted.</p><h3>Service Availability</h3><p>Segervolervix reserves the right to modify or discontinue the service at any time.</p><h3>Governing Terms</h3><p>These terms are governed by the broader Segervolervix platform policies at segervolervix.space.</p>`;

const chatEl = document.getElementById("chat");
const emptyEl = document.getElementById("empty");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send");
const modelSel = document.getElementById("model-sel");

let history = [];
let busy = false;

function saveHistory() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(history)); } catch(e) {}
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || !saved.length) return;
    history = saved;
    saved.forEach(m => renderMsg(m.role === "user" ? "user" : "ai", m.content, m.imgUrl || null, m.model || null, false));
  } catch(e) {}
}

function hideEmpty() { emptyEl.style.display = "none"; }

function renderMsg(role, text, imgUrl, model, scroll) {
  hideEmpty();
  const row = document.createElement("div");
  row.className = "row " + role;
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  const lbl = document.createElement("div");
  lbl.className = "lbl";
  lbl.textContent = role === "user" ? "You" : "NergeAI";
  wrap.appendChild(lbl);
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  if (imgUrl) {
    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = "Generated image";
    bubble.appendChild(img);
  }
  if (role === "ai" && model === "lawyer_ai") {
    const d = document.createElement("span");
    d.className = "disclaimer";
    d.textContent = "\u26a0 This is AI-generated content and does not constitute legal advice. Please consult a qualified lawyer for any legal matters.";
    bubble.appendChild(d);
  }
  wrap.appendChild(bubble);
  if (role === "ai" && model) {
    const badge = document.createElement("div");
    badge.className = "mbadge";
    badge.textContent = model;
    wrap.appendChild(badge);
  }
  const actions = document.createElement("div");
  actions.className = "actions";
  const cp = document.createElement("button");
  cp.className = "abtn";
  cp.textContent = "Copy";
  cp.onclick = () => {
    navigator.clipboard.writeText(text).then(() => {
      cp.textContent = "Copied";
      cp.classList.add("ok");
      setTimeout(() => { cp.textContent = "Copy"; cp.classList.remove("ok"); }, 1600);
    });
  };
  actions.appendChild(cp);
  wrap.appendChild(actions);
  row.appendChild(wrap);
  chatEl.appendChild(row);
  if (scroll !== false) chatEl.scrollTop = chatEl.scrollHeight;
}

function addThinking() {
  hideEmpty();
  const row = document.createElement("div");
  row.className = "row ai";
  row.id = "thinking";
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  const lbl = document.createElement("div");
  lbl.className = "lbl";
  lbl.textContent = "NergeAI";
  wrap.appendChild(lbl);
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';
  wrap.appendChild(bubble);
  row.appendChild(wrap);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function removeThinking() {
  const t = document.getElementById("thinking");
  if (t) t.remove();
}

function extractCmd(text, cmd) {
  const m = text.match(new RegExp(cmd + '\\("([^"]+)"\\)'));
  return m ? m[1] : null;
}

function stripCmds(text) {
  return text.replace(/search_web\("[^"]*"\)\n?/g, "").replace(/imagine_prompt\("[^"]*"\)\n?/g, "").trim();
}

async function doImage(prompt) {
  const res = await fetch(IMAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_KEY },
    body: JSON.stringify({ prompt, api_key: API_KEY })
  });
  const d = await res.json();
  return d.url || d.image_url || d.link || null;
}

async function send() {
  if (busy) return;
  const text = msgInput.value.trim();
  if (!text) return;
  const model = modelSel.value;
  msgInput.value = "";
  msgInput.style.height = "auto";
  busy = true;
  sendBtn.disabled = true;
  renderMsg("user", text, null, null, true);
  history.push({ role: "user", content: text });
  saveHistory();
  addThinking();
  try {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_KEY },
      body: JSON.stringify({
        user_message: text,
        ai_model: model,
        fallback_model: FALLBACK_MODEL,
        system_prompt: SYSTEM_PROMPT,
        search_mode: false,
        history: history.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        api_key: API_KEY
      })
    });
    const data = await res.json();
    const raw = data.ai_message || data.response || data.message || data.reply || "[No response]";
    const searchQ = extractCmd(raw, "search_web");
    const imagineQ = extractCmd(raw, "imagine_prompt");
    let finalText = stripCmds(raw) || raw;
    let imgUrl = null;
    if (searchQ) {
      const sRes = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_KEY },
        body: JSON.stringify({
          user_message: searchQ,
          ai_model: model,
          fallback_model: FALLBACK_MODEL,
          system_prompt: SYSTEM_PROMPT,
          search_mode: true,
          api_key: API_KEY
        })
      });
      const sData = await sRes.json();
      finalText = sData.ai_message || sData.response || sData.message || finalText;
    }
    if (imagineQ) {
      imgUrl = await doImage(imagineQ).catch(() => null);
      if (!finalText) finalText = "Here is your generated image:";
    }
    removeThinking();
    renderMsg("ai", finalText, imgUrl, model, true);
    history.push({ role: "assistant", content: finalText, imgUrl, model });
    saveHistory();
  } catch(err) {
    removeThinking();
    renderMsg("ai", "Error: " + err.message, null, model, true);
  }
  busy = false;
  sendBtn.disabled = false;
}

msgInput.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
msgInput.addEventListener("input", () => { msgInput.style.height = "auto"; msgInput.style.height = Math.min(msgInput.scrollHeight, 130) + "px"; });
sendBtn.addEventListener("click", send);

document.getElementById("clr-btn").addEventListener("click", () => {
  history = [];
  saveHistory();
  chatEl.innerHTML = "";
  chatEl.appendChild(emptyEl);
  emptyEl.style.display = "flex";
});

function openModal(title, html) {
  document.getElementById("modal-t").textContent = title;
  document.getElementById("modal-b").innerHTML = html;
  document.getElementById("overlay").classList.add("on");
}
document.getElementById("pp-btn").addEventListener("click", () => openModal("Privacy Policy", PP_HTML));
document.getElementById("tos-btn").addEventListener("click", () => openModal("Terms of Service", TOS_HTML));
document.getElementById("modal-x").addEventListener("click", () => document.getElementById("overlay").classList.remove("on"));
document.getElementById("overlay").addEventListener("click", e => { if (e.target.id === "overlay") document.getElementById("overlay").classList.remove("on"); });

loadHistory();
</script>
