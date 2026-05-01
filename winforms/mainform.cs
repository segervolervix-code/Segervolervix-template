using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Windows.Forms;

namespace SegerMindWinForms
{
    public partial class MainForm : Form
    {
        private const string ChatUrl = "https://segervolervix.space/api/chat";
        private const string ImageUrl = "https://segervolervix.space/api/imagine";
        private readonly HttpClient httpClient = new HttpClient();
        private readonly List<ChatEntry> chatHistory = new List<ChatEntry>();

        public MainForm()
        {
            InitializeComponent();
            modelCombo.SelectedIndex = 0;
            searchModeCombo.SelectedIndex = 0;
            modelIndicatorLabel.Text = "Active model: nergeenolix";
            systemPromptText.Text =
                "You are SegerMind, a calm, precise AI assistant built on the Segervolervix platform.\r\n\r\n" +
                "Identity and behavior:\r\n" +
                "- Introduce yourself as SegerMind when asked who you are.\r\n" +
                "- Explain that you can chat, reason through problems, search the web when requested, and generate images.\r\n" +
                "- Be concise, structured, and transparent about limitations.\r\n\r\n" +
                "Tools:\r\n" +
                "- When the user writes search_web(\"query\"), treat it as a request to use integrated web search.\r\n" +
                "- When the user writes imagine_prompt(\"prompt\"), treat it as a request to generate an image.\r\n\r\n" +
                "Safety and clarity:\r\n" +
                "- Avoid harmful, illegal, or abusive content.\r\n" +
                "- Encourage users to consult qualified professionals for legal, medical, or financial decisions.\r\n" +
                "- If you are running on the lawyer_ai model, remind the user that your responses are not legal advice.";
        }

        private async void sendButton_Click(object sender, EventArgs e)
        {
            var text = userInputText.Text.Trim();
            if (string.IsNullOrEmpty(text)) return;
            var apiKey = apiKeyText.Text.Trim();
            if (string.IsNullOrEmpty(apiKey))
            {
                MessageBox.Show("Please enter your Segervolervix API key.");
                return;
            }
            var model = modelCombo.SelectedItem?.ToString() ?? "nergeenolix";
            AppendMessage("You", text, model, false, null);
            chatHistory.Add(new ChatEntry { role = "user", content = text, model = model });
            userInputText.Text = "";
            sendButton.Enabled = false;
            try
            {
                var tool = ExtractToolCommand(text);
                if (tool != null && tool.Type == "imagine")
                {
                    await HandleImageGeneration(tool.Payload, apiKey, model);
                }
                else
                {
                    await HandleChatRequest(text, apiKey, model, tool);
                }
            }
            catch
            {
                AppendMessage("SegerMind", "There was an error contacting the Segervolervix API.", model, false, null);
            }
            finally
            {
                sendButton.Enabled = true;
            }
        }

        private ToolCommand ExtractToolCommand(string text)
        {
            var trimmed = text.Trim();
            if (trimmed.StartsWith("search_web(") && trimmed.EndsWith(")"))
            {
                var inner = trimmed.Substring("search_web(".Length, trimmed.Length - "search_web(".Length - 1);
                var payload = inner.Trim().Trim('"').Trim('\'');
                return new ToolCommand { Type = "search", Payload = payload };
            }
            if (trimmed.StartsWith("imagine_prompt(") && trimmed.EndsWith(")"))
            {
                var inner = trimmed.Substring("imagine_prompt(".Length, trimmed.Length - "imagine_prompt(".Length - 1);
                var payload = inner.Trim().Trim('"').Trim('\'');
                return new ToolCommand { Type = "imagine", Payload = payload };
            }
            return null;
        }

        private bool GetSearchMode(string text, ToolCommand tool)
        {
            var modeSetting = searchModeCombo.SelectedItem?.ToString() ?? "Auto";
            if (modeSetting == "Force on") return true;
            if (modeSetting == "Off") return false;
            if (tool != null && tool.Type == "search") return true;
            if (text.Trim().StartsWith("search_web(")) return true;
            return false;
        }

        private async System.Threading.Tasks.Task HandleChatRequest(string text, string apiKey, string model, ToolCommand tool)
        {
            var searchMode = GetSearchMode(text, tool);
            var systemPrompt = systemPromptText.Text.Trim();
            var payload = new ChatRequest
            {
                api_key = apiKey,
                ai_model = model,
                user_message = tool != null && tool.Type == "search" ? tool.Payload : text,
                system_prompt = systemPrompt,
                search_mode = searchMode,
                chat_history = chatHistory
            };
            var success = await SendChatAndDisplay(payload, model, false);
            if (!success && model != "llama-3.3-70b-instruct")
            {
                payload.ai_model = "llama-3.3-70b-instruct";
                await SendChatAndDisplay(payload, "llama-3.3-70b-instruct", true);
            }
        }

        private async System.Threading.Tasks.Task<bool> SendChatAndDisplay(ChatRequest payload, string model, bool isFallback)
        {
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync(ChatUrl, content);
            if (!response.IsSuccessStatusCode)
            {
                AppendMessage("SegerMind", "The chat API returned an error status.", model, false, null);
                return false;
            }
            var body = await response.Content.ReadAsStringAsync();
            ChatResponse data;
            try
            {
                data = JsonSerializer.Deserialize<ChatResponse>(body);
            }
            catch
            {
                AppendMessage("SegerMind", "The chat API returned an unexpected response.", model, false, null);
                return false;
            }
            string aiContent;
            if (data.ai_message is string s)
            {
                aiContent = s;
            }
            else if (data.ai_message is JsonElement el)
            {
                if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String)
                {
                    aiContent = c.GetString();
                }
                else
                {
                    aiContent = el.ToString();
                }
            }
            else
            {
                aiContent = body;
            }
            var disclaimerNeeded = model == "lawyer_ai";
            if (disclaimerNeeded)
            {
                aiContent += "\r\n\r\nDisclaimer: This response is generated by an AI model and must not be treated as legal advice. Always consult a qualified lawyer for legal matters.";
            }
            if (isFallback)
            {
                aiContent = "[Fallback to llama-3.3-70b-instruct]\r\n\r\n" + aiContent;
            }
            AppendMessage("SegerMind", aiContent, model, disclaimerNeeded, null);
            chatHistory.Add(new ChatEntry { role = "ai", content = aiContent, model = model });
            return true;
        }

        private async System.Threading.Tasks.Task HandleImageGeneration(string prompt, string apiKey, string model)
        {
            var request = new ImageRequest
            {
                api_key = apiKey,
                prompt = prompt,
                ai_model = model
            };
            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync(ImageUrl, content);
            if (!response.IsSuccessStatusCode)
            {
                AppendMessage("SegerMind", "The image API returned an error status.", model, false, null);
                return;
            }
            var body = await response.Content.ReadAsStringAsync();
            ImageResponse data;
            try
            {
                data = JsonSerializer.Deserialize<ImageResponse>(body);
            }
            catch
            {
                AppendMessage("SegerMind", "The image API returned an unexpected response.", model, false, null);
                return;
            }
            var url = data.image_url;
            if (string.IsNullOrWhiteSpace(url) && !string.IsNullOrWhiteSpace(data.url)) url = data.url;
            if (string.IsNullOrWhiteSpace(url) && !string.IsNullOrWhiteSpace(data.link)) url = data.link;
            var messageText = "Image generated for prompt: \"" + prompt + "\"";
            if (string.IsNullOrWhiteSpace(url))
            {
                messageText += "\r\nHowever, no image URL was returned by the API.";
                AppendMessage("SegerMind", messageText, model, false, null);
                chatHistory.Add(new ChatEntry { role = "ai", content = messageText, model = model });
                return;
            }
            AppendMessage("SegerMind", messageText + "\r\n\r\nDirect link: " + url, model, false, url);
            chatHistory.Add(new ChatEntry { role = "ai", content = messageText + " (" + url + ")", model = model });
        }

        private void AppendMessage(string roleLabel, string content, string model, bool disclaimer, string imageUrl)
        {
            var header = roleLabel + " • " + model;
            if (disclaimer && roleLabel == "SegerMind") header += " • Not legal advice";
            chatListBox.Items.Add(header);
            chatListBox.Items.Add(content);
            if (!string.IsNullOrEmpty(imageUrl))
            {
                try
                {
                    imagePictureBox.Load(imageUrl);
                }
                catch
                {
                    imagePictureBox.Image = null;
                }
            }
            chatListBox.TopIndex = chatListBox.Items.Count - 1;
        }

        private void modelCombo_SelectedIndexChanged(object sender, EventArgs e)
        {
            var model = modelCombo.SelectedItem?.ToString() ?? "nergeenolix";
            modelIndicatorLabel.Text = "Active model: " + model;
        }

        private void copyButton_Click(object sender, EventArgs e)
        {
            if (chatListBox.SelectedItem == null) return;
            var text = chatListBox.SelectedItem.ToString();
            if (string.IsNullOrEmpty(text)) return;
            try
            {
                Clipboard.SetText(text);
            }
            catch
            {
            }
        }

        private void privacyButton_Click(object sender, EventArgs e)
        {
            var visible = !privacyPanel.Visible;
            privacyPanel.Visible = visible;
            if (visible) tosPanel.Visible = false;
        }

        private void tosButton_Click(object sender, EventArgs e)
        {
            var visible = !tosPanel.Visible;
            tosPanel.Visible = visible;
            if (visible) privacyPanel.Visible = false;
        }

        private void userInputText_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter && !e.Shift)
            {
                e.SuppressKeyPress = true;
                sendButton_Click(sender, e);
            }
        }
    }

    public class ChatEntry
    {
        public string role { get; set; }
        public string content { get; set; }
        public string model { get; set; }
    }

    public class ChatRequest
    {
        public string api_key { get; set; }
        public string ai_model { get; set; }
        public string user_message { get; set; }
        public string system_prompt { get; set; }
        public bool search_mode { get; set; }
        public List<ChatEntry> chat_history { get; set; }
    }

    public class ChatResponse
    {
        public object ai_message { get; set; }
    }

    public class ImageRequest
    {
        public string api_key { get; set; }
        public string prompt { get; set; }
        public string ai_model { get; set; }
    }

    public class ImageResponse
    {
        public string image_url { get; set; }
        public string url { get; set; }
        public string link { get; set; }
    }

    public class ToolCommand
    {
        public string Type { get; set; }
        public string Payload { get; set; }
    }
}
