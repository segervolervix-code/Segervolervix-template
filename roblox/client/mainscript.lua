

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local CHAT_URL = "https://segervolervix.space/api/chat"
local API_KEY = "YOUR_API_KEY"

local system_prompt = "You are a Roblox NPC named Nexar. You never provide links, websites, phone numbers, contact information, or anything that directs players off the Roblox platform. You only speak in safe, in-game friendly dialogue. You never mention APIs or external systems. You live entirely inside Roblox."

local function filterOutput(text)
    text = string.gsub(text, "https?://[%w%p]+", "")
    text = string.gsub(text, "[%w%.%-_]+%.%a%a%a+", "")
    text = string.gsub(text, "%d%d%d[%s%-]?%d%d%d[%s%-]?%d%d%d%d", "")
    text = string.gsub(text, "www%.[%w%p]+", "")
    return text
end

local function sendToAI(msg, history)
    local body = {
        api_key = API_KEY,
        ai_model = "nergeenolix",
        system_prompt = system_prompt,
        user_message = msg,
        history = history,
        search_mode = false
    }
    local json = HttpService:JSONEncode(body)
    local response = HttpService:PostAsync(CHAT_URL, json, Enum.HttpContentType.ApplicationJson)
    local data = HttpService:JSONDecode(response)
    if data.ai_message then
        local clean = filterOutput(data.ai_message)
        table.insert(history, {role="assistant", content=clean})
        return clean
    end
    return "I cannot respond right now."
end

-- UI elements
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "NPCChatUI"
screenGui.Parent = game.Players.LocalPlayer:WaitForChild("PlayerGui")

local frame = Instance.new("Frame")
frame.Name = "ChatFrame"
frame.Size = UDim2.new(0, 300, 0, 400)
frame.Position = UDim2.new(0.5, -150, 0.5, -200)
frame.BackgroundColor3 = Color3.new(0.2, 0.2, 0.2)
frame.BorderSizePixel = 2
frame.Parent = screenGui

local titleBar = Instance.new("Frame")
titleBar.Name = "TitleBar"
titleBar.Size = UDim2.new(1, 0, 0, 25)
titleBar.BackgroundColor3 = Color3.new(0.3, 0.3, 0.3)
titleBar.Parent = frame

local titleLabel = Instance.new("TextLabel")
titleLabel.Name = "TitleLabel"
titleLabel.Size = UDim2.new(0.8, 0, 1, 0)
titleLabel.Position = UDim2.new(0.1, 0, 0, 0)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "NPC Chat"
titleLabel.TextColor3 = Color3.new(1, 1, 1)
titleLabel.Font = Enum.Font.SourceSansBold
titleLabel.TextSize = 14
titleLabel.Parent = titleBar

local closeButton = Instance.new("TextButton")
closeButton.Name = "CloseButton"
closeButton.Size = UDim2.new(0, 25, 1, 0)
closeButton.Position = UDim2.new(0.85, 0, 0, 0)
closeButton.BackgroundTransparency = 0.5
closeButton.Text = "X"
closeButton.TextColor3 = Color3.new(1, 1, 1)
closeButton.Font = Enum.Font.SourceSansBold
closeButton.TextSize = 14
closeButton.Parent = titleBar

local chatFrame = Instance.new("ScrollingFrame")
chatFrame.Name = "ChatFrame"
chatFrame.Size = UDim2.new(1, 0, 0.8, -25)
chatFrame.Position = UDim2.new(0, 0, 0.2, 0)
chatFrame.BackgroundTransparency = 1
chatFrame.ScrollBarThickness = 5
chatFrame.Parent = frame

local chatLayout = Instance.new("UIListLayout")
chatLayout.Name = "ChatLayout"
chatLayout.Padding = UDim.new(0, 5)
chatLayout.Parent = chatFrame

local inputFrame = Instance.new("Frame")
inputFrame.Name = "InputFrame"
inputFrame.Size = UDim2.new(1, 0, 0, 40)
inputFrame.Position = UDim2.new(0, 0, 0.9, 0)
inputFrame.BackgroundColor3 = Color3.new(0.3, 0.3, 0.3)
inputFrame.Parent = frame

local inputField = Instance.new("TextBox")
inputField.Name = "InputField"
inputField.Size = UDim2.new(0.8, 0, 1, 0)
inputField.Position = UDim2.new(0.1, 0, 0, 0)
inputField.BackgroundTransparency = 0.5
inputField.Text = ""
inputField.TextColor3 = Color3.new(1, 1, 1)
inputField.Font = Enum.Font.SourceSans
inputField.TextSize = 14
inputField.Parent = inputFrame

local sendButton = Instance.new("TextButton")
sendButton.Name = "SendButton"
sendButton.Size = UDim2.new(0, 80, 1, 0)
sendButton.Position = UDim2.new(0.9, 0, 0, 0)
sendButton.BackgroundColor3 = Color3.new(0.4, 0.4, 0.4)
sendButton.Text = "Send"
sendButton.TextColor3 = Color3.new(1, 1, 1)
sendButton.Font = Enum.Font.SourceSansBold
sendButton.TextSize = 14
sendButton.Parent = inputFrame

-- Drag functionality
local UserInputService = game:GetService("UserInputService")
local dragging
local dragInput
local dragStart
local startPos

local function update(input)
    local delta = input.Position - dragStart
    frame.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
end

titleBar.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        dragging = true
        dragStart = input.Position
        startPos = frame.Position

        input.Changed:Connect(function()
            if input.UserInputState == Enum.UserInputState.End then
                dragging = false
            end
        end)
    end
end)

titleBar.InputChanged:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseMovement then
        dragInput = input
    end
end)

UserInputService.InputChanged:Connect(function(input)
    if input == dragInput and dragging then
        update(input)
    end
end)

-- Close button functionality
closeButton.MouseButton1Click:Connect(function()
    screenGui:Destroy()
end)

-- Send button functionality
sendButton.MouseButton1Click:Connect(function()
    local message = inputField.Text
    if message ~= "" then
        local history = {}
        local reply = sendToAI(message, history)
        inputField.Text = ""
        local chatMessage = Instance.new("TextLabel")
        chatMessage.Name = "ChatMessage"
        chatMessage.Size = UDim2.new(1, 0, 0, 20)
        chatMessage.BackgroundTransparency = 1
        chatMessage.Text = "You: " .. message
        chatMessage.TextColor3 = Color3.new(1, 1, 1)
        chatMessage.Font = Enum.Font.SourceSans
        chatMessage.TextSize = 14
        chatMessage.Parent = chatFrame
        chatLayout:ApplyLayout()

        chatMessage = Instance.new("TextLabel")
        chatMessage.Name = "ChatMessage"
        chatMessage.Size = UDim2.new(1, 0, 0, 20)
        chatMessage.BackgroundTransparency = 1
        chatMessage.Text = "Nexar: " .. reply
        chatMessage.TextColor3 = Color3.new(0.5, 0.5, 1)
        chatMessage.Font = Enum.Font.SourceSans
        chatMessage.TextSize = 14
        chatMessage.Parent = chatFrame
        chatLayout:ApplyLayout()
    end
end)

inputField.FocusLost:Connect(function(enterPressed)
    if enterPressed then
        sendButton.MouseButton1Click:Connect()
    end
end)
