# Segervolervix Demo Console

This repository contains a futuristic, neon‑styled web console for interacting with the **Segervolervix API**.  
It demonstrates both **chat completion** and **AI image generation** using a secure, browser‑based interface.

This project is intended **for demonstration purposes only**.  
Do **not** use this code in production with a hard‑coded API key.

---

## 🚀 Features

### ✔ Chat Interface
Send text prompts to the Segervolervix `/api/chat` endpoint and display responses in a terminal‑style output window.

### ✔ AI Image Generation
Submit prompts to `/api/imagine`, fetch the resulting image securely as a Blob, and render it in a protected viewer.

### ✔ Futuristic UI
The interface uses:
- Neon glow effects  
- Holographic accents  
- Animated message entries  
- A dark, cyber‑console aesthetic  

### ✔ Security‑Aware Image Handling
Images are **never** loaded directly from remote URLs.  
Instead, they are fetched as binary blobs and displayed via `URL.createObjectURL()` to avoid:
- Redirect exploits  
- Navigation hijacking  
- Embedded malicious content  

---

## ⚙️ Setup Instructions

1. Clone or download this repository.
2. Open `index.html` in any modern browser.
3. Replace the placeholder API key:

   API_KEY = "YOUR_API_KEY"

   
⚠ **Important:**  
This is only acceptable for demos.  
In real applications, API keys must be stored securely (server‑side, environment variables, or protected vaults).

No build tools or dependencies are required.

---

## 🔌 API Endpoints Used

### **POST /api/chat**
Sends a text message and receives an AI‑generated reply.

**Request Body:**
```json
{ "message": "your text here" }



