local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local CHAT_URL = "https://segervolervix.space/api/chat"
local API_KEY = "YOUR_API_KEY"

local npc = Instance.new("Model")
npc.Name = "AI_NPC"
local humanoid = Instance.new("Humanoid")
humanoid.Parent = npc
local head = Instance.new("Part")
head.Name = "Head"
head.Size = Vector3.new(2,1,1)
head.Position = Vector3.new(0,5,0)
head.Parent = npc
local root = Instance.new("Part")
root.Name = "HumanoidRootPart"
root.Size = Vector3.new(2,2,1)
root.Position = Vector3.new(0,4,0)
root.Parent = npc
npc.PrimaryPart = root
npc.Parent = workspace

local history = {}

local system_prompt = "You are a Roblox NPC named Nexar. You never provide links, websites, phone numbers, contact information, or anything that directs players off the Roblox platform. You only speak in safe, in-game friendly dialogue. You never mention APIs or external systems. You live entirely inside Roblox."

local function filterOutput(text)
    text = string.gsub(text,"https?://[%w%p]+","")
    text = string.gsub(text,"[%w%.%-_]+%.%a%a%a+","")
    text = string.gsub(text,"%d%d%d[%s%-]?%d%d%d[%s%-]?%d%d%d%d","")
    text = string.gsub(text,"www%.[%w%p]+","")
    return text
end

local function sendToAI(msg)
    table.insert(history,{role="user",content=msg})
    local body = {
        api_key = API_KEY,
        ai_model = "nergeenolix",
        system_prompt = system_prompt,
        user_message = msg,
        history = history,
        search_mode = false
    }
    local json = HttpService:JSONEncode(body)
    local response = HttpService:PostAsync(CHAT_URL,json,Enum.HttpContentType.ApplicationJson)
    local data = HttpService:JSONDecode(response)
    if data.ai_message then
        local clean = filterOutput(data.ai_message)
        table.insert(history,{role="assistant",content=clean})
        return clean
    end
    return "I cannot respond right now."
end

Players.PlayerAdded:Connect(function(player)
    player.Chatted:Connect(function(msg)
        local reply = sendToAI(msg)
        game:GetService("Chat"):Chat(npc.Head,reply,Enum.ChatColor.White)
    end)
end)
