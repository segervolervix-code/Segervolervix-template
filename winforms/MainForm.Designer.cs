using System.Windows.Forms;

namespace SegerMindWinForms
{
    partial class MainForm
    {
        private System.ComponentModel.IContainer components = null;
        private Label titleLabel;
        private Label subtitleLabel;
        private ComboBox modelCombo;
        private ComboBox searchModeCombo;
        private TextBox systemPromptText;
        private ListBox chatListBox;
        private TextBox userInputText;
        private Button sendButton;
        private Button copyButton;
        private Button privacyButton;
        private Button tosButton;
        private Panel privacyPanel;
        private Panel tosPanel;
        private Label privacyLabel;
        private Label tosLabel;
        private Label modelLabel;
        private Label searchModeLabel;
        private Label systemPromptLabel;
        private Label conversationLabel;
        private Label modelIndicatorLabel;
        private PictureBox imagePictureBox;

        protected override void Dispose(bool disposing)
        {
            if (disposing && components != null) components.Dispose();
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            components = new System.ComponentModel.Container();
            titleLabel = new Label();
            subtitleLabel = new Label();
            modelCombo = new ComboBox();
            searchModeCombo = new ComboBox();
            systemPromptText = new TextBox();
            chatListBox = new ListBox();
            userInputText = new TextBox();
            sendButton = new Button();
            copyButton = new Button();
            privacyButton = new Button();
            tosButton = new Button();
            privacyPanel = new Panel();
            tosPanel = new Panel();
            privacyLabel = new Label();
            tosLabel = new Label();
            modelLabel = new Label();
            searchModeLabel = new Label();
            systemPromptLabel = new Label();
            conversationLabel = new Label();
            modelIndicatorLabel = new Label();
            imagePictureBox = new PictureBox();
            ((System.ComponentModel.ISupportInitialize)imagePictureBox).BeginInit();
            SuspendLayout();
            BackColor = System.Drawing.Color.FromArgb(244, 245, 247);
            Font = new System.Drawing.Font("Segoe UI", 9F);
            Text = "SegerMind AI Studio";
            Width = 960;
            Height = 720;
            titleLabel.Text = "SegerMind AI Studio";
            titleLabel.Font = new System.Drawing.Font("Segoe UI", 16F, System.Drawing.FontStyle.Bold);
            titleLabel.AutoSize = true;
            titleLabel.Left = 20;
            titleLabel.Top = 15;
            subtitleLabel.Text = "A focused interface for Segervolervix models, combining conversational intelligence, web search, and image generation in a single, professional workspace.";
            subtitleLabel.Font = new System.Drawing.Font("Segoe UI", 9F);
            subtitleLabel.AutoSize = false;
            subtitleLabel.Left = 20;
            subtitleLabel.Top = 50;
            subtitleLabel.Width = 900;
            subtitleLabel.Height = 40;
            modelLabel.Text = "Model";
            modelLabel.Left = 20;
            modelLabel.Top = 100;
            modelLabel.AutoSize = true;
            modelCombo.Left = 20;
            modelCombo.Top = 120;
            modelCombo.Width = 200;
            modelCombo.DropDownStyle = ComboBoxStyle.DropDownList;
            modelCombo.Items.AddRange(new object[]
            {
                "nergeenolix",
                "llama-3.3-70b-instruct",
                "nergeenolix_1.0",
                "llama-4-scout",
                "llama-3-8b-instruct",
                "nergeenolix_1.0beta",
                "nergeenolix_rp",
                "lawyer_ai",
                "web_searcher",
                "nergeenolix_coder"
            });
            modelCombo.SelectedIndexChanged += modelCombo_SelectedIndexChanged;
            searchModeLabel.Text = "Search mode";
            searchModeLabel.Left = 240;
            searchModeLabel.Top = 100;
            searchModeLabel.AutoSize = true;
            searchModeCombo.Left = 240;
            searchModeCombo.Top = 120;
            searchModeCombo.Width = 160;
            searchModeCombo.DropDownStyle = ComboBoxStyle.DropDownList;
            searchModeCombo.Items.AddRange(new object[]
            {
                "Auto",
                "Off",
                "Force on"
            });
            systemPromptLabel.Text = "System instructions";
            systemPromptLabel.Left = 20;
            systemPromptLabel.Top = 160;
            systemPromptLabel.AutoSize = true;
            systemPromptText.Left = 20;
            systemPromptText.Top = 180;
            systemPromptText.Width = 350;
            systemPromptText.Height = 140;
            systemPromptText.Multiline = true;
            systemPromptText.ScrollBars = ScrollBars.Vertical;
            conversationLabel.Text = "Conversation";
            conversationLabel.Left = 390;
            conversationLabel.Top = 160;
            conversationLabel.AutoSize = true;
            chatListBox.Left = 390;
            chatListBox.Top = 180;
            chatListBox.Width = 540;
            chatListBox.Height = 260;
            chatListBox.BorderStyle = BorderStyle.FixedSingle;
            userInputText.Left = 20;
            userInputText.Top = 340;
            userInputText.Width = 350;
            userInputText.Height = 100;
            userInputText.Multiline = true;
            userInputText.ScrollBars = ScrollBars.Vertical;
            userInputText.KeyDown += userInputText_KeyDown;
            sendButton.Text = "Send";
            sendButton.Left = 20;
            sendButton.Top = 450;
            sendButton.Width = 100;
            sendButton.Height = 30;
            sendButton.BackColor = System.Drawing.Color.FromArgb(37, 99, 235);
            sendButton.ForeColor = System.Drawing.Color.White;
            sendButton.FlatStyle = FlatStyle.Flat;
            sendButton.Click += sendButton_Click;
            copyButton.Text = "Copy text";
            copyButton.Left = 130;
            copyButton.Top = 450;
            copyButton.Width = 100;
            copyButton.Height = 30;
            copyButton.FlatStyle = FlatStyle.Flat;
            copyButton.Click += copyButton_Click;
            privacyButton.Text = "Privacy policy";
            privacyButton.Left = 20;
            privacyButton.Top = 500;
            privacyButton.Width = 120;
            privacyButton.Height = 28;
            privacyButton.FlatStyle = FlatStyle.Flat;
            privacyButton.Click += privacyButton_Click;
            tosButton.Text = "Terms of service";
            tosButton.Left = 150;
            tosButton.Top = 500;
            tosButton.Width = 120;
            tosButton.Height = 28;
            tosButton.FlatStyle = FlatStyle.Flat;
            tosButton.Click += tosButton_Click;
            privacyPanel.Left = 20;
            privacyPanel.Top = 540;
            privacyPanel.Width = 430;
            privacyPanel.Height = 100;
            privacyPanel.BackColor = System.Drawing.Color.FromArgb(249, 250, 251);
            privacyPanel.BorderStyle = BorderStyle.FixedSingle;
            privacyPanel.Visible = false;
            privacyLabel.Text = "SegerMind AI Studio processes your input solely to communicate with the Segervolervix API using your provided key. Your API key and messages are stored only in this session and are not persisted by this application. You are responsible for complying with any data protection or confidentiality obligations that apply to the content you submit. Avoid sharing sensitive personal information, proprietary data, or regulated content unless you have the right to do so and understand the risks.";
            privacyLabel.Left = 8;
            privacyLabel.Top = 8;
            privacyLabel.Width = 410;
            privacyLabel.Height = 80;
            privacyPanel.Controls.Add(privacyLabel);
            tosPanel.Left = 20;
            tosPanel.Top = 540;
            tosPanel.Width = 430;
            tosPanel.Height = 100;
            tosPanel.BackColor = System.Drawing.Color.FromArgb(249, 250, 251);
            tosPanel.BorderStyle = BorderStyle.FixedSingle;
            tosPanel.Visible = false;
            tosLabel.Text = "By using SegerMind AI Studio, you agree that all model outputs are provided \"as is\" without any warranty. You remain solely responsible for how you interpret and use responses, including any decisions or actions taken based on them. This interface is a thin client for the Segervolervix API; all usage must comply with the official Segervolervix terms and any applicable laws. Do not use this tool for harmful, illegal, or high-risk purposes. For legal, medical, financial, or other professional matters, always consult a qualified human expert.";
            tosLabel.Left = 8;
            tosLabel.Top = 8;
            tosLabel.Width = 410;
            tosLabel.Height = 80;
            tosPanel.Controls.Add(tosLabel);
            modelIndicatorLabel.Left = 640;
            modelIndicatorLabel.Top = 120;
            modelIndicatorLabel.Width = 290;
            modelIndicatorLabel.Height = 20;
            modelIndicatorLabel.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            imagePictureBox.Left = 390;
            imagePictureBox.Top = 450;
            imagePictureBox.Width = 540;
            imagePictureBox.Height = 190;
            imagePictureBox.SizeMode = PictureBoxSizeMode.Zoom;
            Controls.Add(titleLabel);
            Controls.Add(subtitleLabel);
            Controls.Add(modelLabel);
            Controls.Add(modelCombo);
            Controls.Add(searchModeLabel);
            Controls.Add(searchModeCombo);
            Controls.Add(systemPromptLabel);
            Controls.Add(systemPromptText);
            Controls.Add(conversationLabel);
            Controls.Add(chatListBox);
            Controls.Add(userInputText);
            Controls.Add(sendButton);
            Controls.Add(copyButton);
            Controls.Add(privacyButton);
            Controls.Add(tosButton);
            Controls.Add(privacyPanel);
            Controls.Add(tosPanel);
            Controls.Add(modelIndicatorLabel);
            Controls.Add(imagePictureBox);
            ((System.ComponentModel.ISupportInitialize)imagePictureBox).EndInit();
            ResumeLayout(false);
        }
    }
}
