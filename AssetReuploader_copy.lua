-- Fast Asset Reuploader c 2026
local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local Selection = game:GetService("Selection")

local toolbar = plugin:CreateToolbar("ReuploaderMt7Asset")
local toggleBtn = toolbar:CreateButton("m-spoofer", "Open ReuploaderMt7Asset", "rbxassetid://82481578115772")

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Float, false, false, 400, 300, 300, 200
)

local widget = plugin:CreateDockWidgetPluginGui("ReuploaderMt7Asset v1.0Widget", widgetInfo)
widget.Title = "ReuploaderMt7Asset v1.0"
widget.Name = "ReuploaderMt7Asset v1.0Widget"

toggleBtn.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

-- Classic Blue Theme
local Theme = {
	Background = Color3.fromRGB(20, 30, 45),
	TabBg = Color3.fromRGB(15, 25, 40),
	TabBgActive = Color3.fromRGB(30, 60, 100),
	ButtonBg = Color3.fromRGB(25, 45, 80),
	ButtonHover = Color3.fromRGB(35, 65, 110),
	Border = Color3.fromRGB(10, 15, 25),
	Text = Color3.fromRGB(220, 230, 255),
	TextDim = Color3.fromRGB(130, 150, 180),
}

local bg = Instance.new("Frame")
bg.Size = UDim2.new(1, 0, 1, 0)
bg.BackgroundColor3 = Theme.Background
bg.BorderSizePixel = 0
bg.Parent = widget

-- Header (Tabs)
local header = Instance.new("Frame")
header.Size = UDim2.new(1, 0, 0, 25)
header.BackgroundColor3 = Theme.TabBg
header.BorderColor3 = Theme.Border
header.BorderSizePixel = 1
header.Parent = bg

local tabLayout = Instance.new("UIListLayout")
tabLayout.FillDirection = Enum.FillDirection.Horizontal
tabLayout.SortOrder = Enum.SortOrder.LayoutOrder
tabLayout.Parent = header

local contentArea = Instance.new("Frame")
contentArea.Size = UDim2.new(1, 0, 1, -25)
contentArea.Position = UDim2.new(0, 0, 0, 25)
contentArea.BackgroundTransparency = 1
contentArea.Parent = bg

local tabs = {}
local tabFrames = {}

local function createTab(name, order)
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(1/6, 0, 1, 0)
	btn.BackgroundColor3 = Theme.TabBg
	btn.BorderColor3 = Theme.Border
	btn.BorderSizePixel = 1
	btn.Text = name
	btn.Font = Enum.Font.SourceSans
	btn.TextColor3 = Theme.TextDim
	btn.TextSize = 14
	btn.LayoutOrder = order
	btn.Parent = header

	local frame = Instance.new("Frame")
	frame.Size = UDim2.new(1, 0, 1, 0)
	frame.BackgroundTransparency = 1
	frame.Visible = false
	frame.Parent = contentArea

	tabs[name] = btn
	tabFrames[name] = frame

	btn.MouseButton1Click:Connect(function()
		for tName, tBtn in pairs(tabs) do
			tBtn.BackgroundColor3 = Theme.TabBg
			tBtn.TextColor3 = Theme.TextDim
			tabFrames[tName].Visible = false
		end
		btn.BackgroundColor3 = Theme.TabBgActive
		btn.TextColor3 = Theme.Text
		frame.Visible = true
	end)

	return frame
end

local animFrame = createTab("Animation", 1)
local meshFrame = createTab("Mesh", 2)
local audioFrame = createTab("Audio", 3)
local imageFrame = createTab("Image", 4)
local replaceFrame = createTab("Replace", 5)
local settingsFrame = createTab("Settings", 6)

-- Default Tab: Animation
tabs["Animation"].BackgroundColor3 = Theme.TabBgActive
tabs["Animation"].TextColor3 = Theme.Text
tabFrames["Animation"].Visible = true

-- Helper: create button
local function createButton(parent, text, yPos)
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(1, -20, 0, 25)
	btn.Position = UDim2.new(0, 10, 0, yPos)
	btn.BackgroundColor3 = Theme.ButtonBg
	btn.BorderColor3 = Theme.Border
	btn.BorderSizePixel = 1
	btn.Text = text
	btn.Font = Enum.Font.SourceSans
	btn.TextColor3 = Theme.Text
	btn.TextSize = 14
	btn.Parent = parent

	btn.MouseEnter:Connect(function() btn.BackgroundColor3 = Theme.ButtonHover end)
	btn.MouseLeave:Connect(function() btn.BackgroundColor3 = Theme.ButtonBg end)

	return btn
end

-- Helper: create status label
local function createStatusLabel(parent, yPos)
	local lbl = Instance.new("TextLabel")
	lbl.Size = UDim2.new(1, -20, 0, 20)
	lbl.Position = UDim2.new(0, 10, 0, yPos)
	lbl.BackgroundTransparency = 1
	lbl.Text = ""
	lbl.Font = Enum.Font.SourceSans
	lbl.TextColor3 = Theme.TextDim
	lbl.TextSize = 13
	lbl.TextXAlignment = Enum.TextXAlignment.Left
	lbl.Parent = parent
	return lbl
end

-- Global Settings State
local ownerUploadMode = "User"
local ownerUploadId = ""

-- Replace Tab Log Container
local replaceScroll = Instance.new("ScrollingFrame")
replaceScroll.Size = UDim2.new(1, -20, 1, -20)
replaceScroll.Position = UDim2.new(0, 10, 0, 10)
replaceScroll.BackgroundTransparency = 1
replaceScroll.BorderSizePixel = 0
replaceScroll.ScrollBarThickness = 6
replaceScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
replaceScroll.Parent = replaceFrame

local replaceLayout = Instance.new("UIListLayout")
replaceLayout.SortOrder = Enum.SortOrder.LayoutOrder
replaceLayout.Padding = UDim.new(0, 2)
replaceLayout.Parent = replaceScroll

local function addReplaceLog(assetType, oldId, newId)
	local logLbl = Instance.new("TextLabel")
	logLbl.Size = UDim2.new(1, 0, 0, 18)
	logLbl.BackgroundTransparency = 1
	logLbl.Text = string.format("[%s] %s ➔ %s", assetType, oldId, newId)
	logLbl.Font = Enum.Font.SourceSans
	logLbl.TextColor3 = Theme.Text
	logLbl.TextSize = 14
	logLbl.TextXAlignment = Enum.TextXAlignment.Left
	logLbl.Parent = replaceScroll
	replaceScroll.CanvasSize = UDim2.new(0, 0, 0, replaceLayout.AbsoluteContentSize.Y)
end

local function addErrorLog(assetType, oldId, errorMessage)
	local logLbl = Instance.new("TextLabel")
	logLbl.Size = UDim2.new(1, 0, 0, 18)
	logLbl.BackgroundTransparency = 1
	logLbl.Text = string.format("[%s] %s ➔ FAILED: %s", assetType, oldId, tostring(errorMessage or "Unknown Error"))
	logLbl.Font = Enum.Font.SourceSans
	logLbl.TextColor3 = Color3.fromRGB(255, 100, 100)
	logLbl.TextSize = 14
	logLbl.TextXAlignment = Enum.TextXAlignment.Left
	logLbl.TextWrapped = false
	logLbl.ClipsDescendants = true
	logLbl.Parent = replaceScroll
	replaceScroll.CanvasSize = UDim2.new(0, 0, 0, replaceLayout.AbsoluteContentSize.Y)
end

-- ═══════════════════════════════════════════════
-- Script Helpers
-- ═══════════════════════════════════════════════

local function getIdsFromScript(inst)
	local ids = {}
	for id in string.gmatch(inst.Source, "rbxassetid://(%d+)") do
		table.insert(ids, id)
	end
	for id in string.gmatch(inst.Source, "[iI][dD]%s*=%s*(%d+)") do
		table.insert(ids, id)
	end
	for id in string.gmatch(inst.Source, "roblox%.com/asset/%?id=(%d+)") do
		table.insert(ids, id)
	end
	
	if #ids > 0 then
		return ids
	end
	return nil
end

local function replaceIdInScript(inst, oldId, newId)
	inst.Source = string.gsub(inst.Source, "%d+", function(match)
		if match == tostring(oldId) then
			return tostring(newId)
		end
		return match
	end)
end

-- ═══════════════════════════════════════════════
-- Generic Reupload Function
-- ═══════════════════════════════════════════════

local function doReupload(instancesToScan, assetType, getIdFunc, setIdFunc, statusLabel)
	statusLabel.Text = "Scanning..."

	local idMap = {}
	local instances = {}

	local function processInstance(inst)
		local success, result = pcall(function()
			return getIdFunc(inst)
		end)
		if not success then return end
		
		if result then
			if type(result) == "table" then
				if #result > 0 then
					instances[inst] = result
					for _, id in ipairs(result) do
						idMap[id] = true
					end
				end
			else
				instances[inst] = result
				idMap[result] = true
			end
		end
	end

	for _, inst in ipairs(instancesToScan) do
		processInstance(inst)
		for _, desc in ipairs(inst:GetDescendants()) do
			processInstance(desc)
		end
	end

	local uniqueIds = {}
	for id, _ in pairs(idMap) do
		table.insert(uniqueIds, id)
	end

	if #uniqueIds == 0 then
		statusLabel.Text = "No " .. assetType .. "s found."
		return
	end

	-- Group instances by their old asset id, since several instances can
	-- share the same id and all of them need to be updated once it's ready.
	local idToInstances = {}
	for inst, val in pairs(instances) do
		if type(val) == "table" then
			for _, oldId in ipairs(val) do
				if not idToInstances[oldId] then
					idToInstances[oldId] = {}
				end
				local alreadyAdded = false
				for _, existingInst in ipairs(idToInstances[oldId]) do
					if existingInst == inst then
						alreadyAdded = true
						break
					end
				end
				if not alreadyAdded then
					table.insert(idToInstances[oldId], inst)
				end
			end
		else
			local oldId = val
			if not idToInstances[oldId] then
				idToInstances[oldId] = {}
			end
			table.insert(idToInstances[oldId], inst)
		end
	end

	statusLabel.Text = "Found " .. #uniqueIds .. " unique " .. assetType .. "s. Sending..."
	print("[ReuploaderMt7Asset v1.0] Found " .. #uniqueIds .. " unique " .. assetType .. " IDs.")

	-- Split IDs into chunks of 500 to avoid payload size limits
	local CHUNK_SIZE = 500
	local chunks = {}
	for i = 1, #uniqueIds, CHUNK_SIZE do
		local chunk = {}
		for j = i, math.min(i + CHUNK_SIZE - 1, #uniqueIds) do
			table.insert(chunk, uniqueIds[j])
		end
		table.insert(chunks, chunk)
	end

	-- Send each chunk as a separate job
	local jobIds = {}
	for ci, chunk in ipairs(chunks) do
		statusLabel.Text = "Sending chunk " .. ci .. "/" .. #chunks .. " (" .. #chunk .. " IDs)..."
		local startSuccess, startResult = pcall(function()
			return HttpService:PostAsync("http://127.0.0.1:3000/api/replace", HttpService:JSONEncode({
				ids = chunk,
				assetType = assetType,
				creatorType = ownerUploadMode,
				creatorId = ownerUploadId
			}), Enum.HttpContentType.ApplicationJson)
		end)

		if not startSuccess then
			statusLabel.Text = "Error: Can't connect to server."
			warn("[ReuploaderMt7Asset v1.0] Failed to connect: " .. tostring(startResult))
			return
		end

		local startData = HttpService:JSONDecode(startResult)
		if not startData.jobId then
			statusLabel.Text = "Error: Server returned invalid data."
			warn("[ReuploaderMt7Asset v1.0] Server returned invalid data.")
			return
		end
		table.insert(jobIds, startData.jobId)
	end

	print("[ReuploaderMt7Asset v1.0] Started " .. #jobIds .. " job(s).")

	-- Poll all jobs concurrently and replace assets as results come in
	ChangeHistoryService:SetWaypoint("Before " .. assetType .. " Reupload")

	local applied = {}
	local processedIds = 0
	local replaceCount = 0
	local failCount = 0
	local completedJobs = {}
	local pollFailures = {}

	while true do
		local allDone = true
		for ji, jobId in ipairs(jobIds) do
			if not completedJobs[jobId] then
				allDone = false

				local pollSuccess, pollResult = pcall(function()
					return HttpService:GetAsync("http://127.0.0.1:3000/api/replace/status/" .. jobId, true)
				end)

				if pollSuccess then
					pollFailures[jobId] = 0
					local decodeSuccess, statusData = pcall(function()
						return HttpService:JSONDecode(pollResult)
					end)

					if decodeSuccess and type(statusData) == "table" and type(statusData.results) == "table" then
						for _, oldId in ipairs(chunks[ji] or {}) do
							local entry = statusData.results[oldId]
							if entry and not applied[oldId] then
								applied[oldId] = true
								processedIds = processedIds + 1

								if entry.status == "Success" then
									local newId = entry.newId
									if newId and tostring(newId) ~= "nil" and tostring(newId) ~= "null" then
										for _, inst in ipairs(idToInstances[oldId] or {}) do
											local success, err = pcall(function()
												setIdFunc(inst, newId, oldId)
											end)
											if success then
												replaceCount = replaceCount + 1
											else
												warn("[ReuploaderMt7Asset] Failed to set ID in " .. (inst and inst.Name or "Unknown") .. ": " .. tostring(err))
											end
										end
										addReplaceLog(assetType, oldId, tostring(newId))
									end
								elseif entry.status == "Failed" then
									failCount = failCount + #(idToInstances[oldId] or {})
									addErrorLog(assetType, oldId, entry.error)
								end
							end
						end

						if statusData.done then
							completedJobs[jobId] = true
						end
					end
				else
					pollFailures[jobId] = (pollFailures[jobId] or 0) + 1
					if pollFailures[jobId] > 10 then
						warn("[ReuploaderMt7Asset] Job " .. jobId .. " failed to poll 10 times. Marking as done to prevent freeze.")
						completedJobs[jobId] = true
					end
				end
			end
		end

		statusLabel.Text = "Replacing... " .. processedIds .. "/" .. #uniqueIds
			.. " (Replaced: " .. replaceCount .. ", Failed: " .. failCount .. ")"

		if allDone then break end
		task.wait(0.5)
	end

	ChangeHistoryService:SetWaypoint("After " .. assetType .. " Reupload")
	statusLabel.Text = "Done! Replaced: " .. replaceCount .. " | Failed: " .. failCount
	print("[ReuploaderMt7Asset v1.0] " .. assetType .. " reupload done. Replaced: " .. replaceCount .. ", Failed: " .. failCount)
end

-- ═══════════════════════════════════════════════
-- Animation Tab
-- ═══════════════════════════════════════════════

local animReuploadBtn = createButton(animFrame, "Reupload All", 10)
local animReuploadSelBtn = createButton(animFrame, "Reupload Selected", 40)
local animStatus = createStatusLabel(animFrame, 75)

local function getAnimId(inst)
	if inst:IsA("Animation") then
		return string.match(inst.AnimationId, "%d+")
	elseif inst:IsA("LuaSourceContainer") then
		return getIdsFromScript(inst)
	end
	return nil
end

local function setAnimId(inst, newId, oldId)
	if inst:IsA("Animation") then
		inst.AnimationId = "rbxassetid://" .. tostring(newId)
	elseif inst:IsA("LuaSourceContainer") then
		replaceIdInScript(inst, oldId, newId)
	end
end

animReuploadBtn.MouseButton1Click:Connect(function()
	local services = {
		game:GetService("Workspace"),
		game:GetService("ReplicatedStorage"),
		game:GetService("ServerStorage"),
		game:GetService("StarterGui"),
		game:GetService("StarterPlayer"),
		game:GetService("StarterPack"),
	}
	doReupload(services, "Animation", getAnimId, setAnimId, animStatus)
end)

animReuploadSelBtn.MouseButton1Click:Connect(function()
	doReupload(Selection:Get(), "Animation", getAnimId, setAnimId, animStatus)
end)


-- ═══════════════════════════════════════════════
-- Mesh Tab
-- ═══════════════════════════════════════════════

local meshReuploadBtn = createButton(meshFrame, "Reupload All", 10)
local meshReuploadSelBtn = createButton(meshFrame, "Reupload Selected", 40)
local meshStatus = createStatusLabel(meshFrame, 75)

local function getMeshId(inst)
	if inst:IsA("MeshPart") then
		local id = string.match(inst.MeshId, "%d+")
		if id then return id end
	elseif inst:IsA("SpecialMesh") then
		local id = string.match(inst.MeshId, "%d+")
		if id then return id end
	elseif inst:IsA("LuaSourceContainer") then
		return getIdsFromScript(inst)
	end
	return nil
end

local function setMeshId(inst, newId, oldId)
	local newMeshString = "rbxassetid://" .. tostring(newId)
	
	if inst:IsA("MeshPart") then
		local success, err = pcall(function()
			inst.MeshId = newMeshString
		end)
		
		if not success then
			-- Fallback: create a new MeshPart to replace the old one
			local newPart
			local s1, e1 = pcall(function()
				newPart = game:GetService("InsertService"):CreateMeshPartAsync(newMeshString, inst.CollisionFidelity, inst.RenderFidelity)
			end)
			
			if not newPart then
				pcall(function()
					-- Try AssetService if InsertService fails
					newPart = game:GetService("AssetService"):CreateMeshPartAsync(newMeshString)
				end)
			end
			
			if newPart then
				-- Copy common properties
				local props = {
					"Name", "CFrame", "Size", "Color", "Material", "MaterialVariant", 
					"Reflectance", "Transparency", "TextureID", "Anchored", 
					"CanCollide", "CanTouch", "CanQuery", "CustomPhysicalProperties", 
					"CollisionGroup", "DoubleSided", "CastShadow", "Massless", "RootPriority"
				}
				for _, prop in ipairs(props) do
					pcall(function()
						newPart[prop] = inst[prop]
					end)
				end
				
				-- Move children
				for _, child in ipairs(inst:GetChildren()) do
					child.Parent = newPart
				end
				
				newPart.Parent = inst.Parent
				inst:Destroy()
			else
				warn("[ReuploaderMt7Asset v1.0] Failed to swap MeshPart:", tostring(e1))
			end
		end
	elseif inst:IsA("SpecialMesh") then
		pcall(function()
			inst.MeshId = newMeshString
		end)
	elseif inst:IsA("LuaSourceContainer") then
		replaceIdInScript(inst, oldId, newId)
	end
end

meshReuploadBtn.MouseButton1Click:Connect(function()
	local services = {
		game:GetService("Workspace"),
		game:GetService("ReplicatedStorage"),
		game:GetService("ServerStorage"),
		game:GetService("StarterGui"),
		game:GetService("StarterPlayer"),
		game:GetService("StarterPack"),
	}
	doReupload(services, "Mesh", getMeshId, setMeshId, meshStatus)
end)

meshReuploadSelBtn.MouseButton1Click:Connect(function()
	doReupload(Selection:Get(), "Mesh", getMeshId, setMeshId, meshStatus)
end)


-- ═══════════════════════════════════════════════
-- Audio Tab
-- ═══════════════════════════════════════════════

local audioReuploadBtn = createButton(audioFrame, "Reupload All", 10)
local audioReuploadSelBtn = createButton(audioFrame, "Reupload Selected", 40)
local audioStatus = createStatusLabel(audioFrame, 75)

local function getAudioId(inst)
	if inst:IsA("Sound") then
		local id = string.match(inst.SoundId, "%d+")
		if id then return id end
	elseif inst:IsA("LuaSourceContainer") then
		return getIdsFromScript(inst)
	end
	return nil
end

local function setAudioId(inst, newId, oldId)
	if inst:IsA("Sound") then
		pcall(function()
			inst.SoundId = "rbxassetid://" .. tostring(newId)
		end)
	elseif inst:IsA("LuaSourceContainer") then
		replaceIdInScript(inst, oldId, newId)
	end
end

audioReuploadBtn.MouseButton1Click:Connect(function()
	local services = {
		game:GetService("Workspace"),
		game:GetService("ReplicatedStorage"),
		game:GetService("ServerStorage"),
		game:GetService("StarterGui"),
		game:GetService("StarterPlayer"),
		game:GetService("StarterPack"),
	}
	doReupload(services, "Audio", getAudioId, setAudioId, audioStatus)
end)

audioReuploadSelBtn.MouseButton1Click:Connect(function()
	doReupload(Selection:Get(), "Audio", getAudioId, setAudioId, audioStatus)
end)

-- ═══════════════════════════════════════════════
-- Image Tab
-- ═══════════════════════════════════════════════

local imageReuploadBtn = createButton(imageFrame, "Reupload All", 10)
local imageReuploadSelBtn = createButton(imageFrame, "Reupload Selected", 40)
local imageStatus = createStatusLabel(imageFrame, 75)

local function getImageId(inst)
	local prop
	if inst:IsA("Decal") or inst:IsA("Texture") then
		prop = "Texture"
	elseif inst:IsA("ImageLabel") or inst:IsA("ImageButton") then
		prop = "Image"
	end
	
	if prop then
		local id = string.match(inst[prop], "%d+")
		if id then return id end
	elseif inst:IsA("LuaSourceContainer") then
		return getIdsFromScript(inst)
	end
	return nil
end

local function setImageId(inst, newId, oldId)
	local prop
	if inst:IsA("Decal") or inst:IsA("Texture") then
		prop = "Texture"
	elseif inst:IsA("ImageLabel") or inst:IsA("ImageButton") then
		prop = "Image"
	end
	
	if prop then
		pcall(function()
			inst[prop] = "rbxassetid://" .. tostring(newId)
		end)
	elseif inst:IsA("LuaSourceContainer") then
		replaceIdInScript(inst, oldId, newId)
	end
end

imageReuploadBtn.MouseButton1Click:Connect(function()
	local services = {
		game:GetService("Workspace"),
		game:GetService("ReplicatedStorage"),
		game:GetService("ServerStorage"),
		game:GetService("StarterGui"),
		game:GetService("StarterPlayer"),
		game:GetService("StarterPack"),
	}
	doReupload(services, "Image", getImageId, setImageId, imageStatus)
end)

imageReuploadSelBtn.MouseButton1Click:Connect(function()
	doReupload(Selection:Get(), "Image", getImageId, setImageId, imageStatus)
end)


-- ═══════════════════════════════════════════════
-- Replace Tab (Now handled by ScrollingFrame logic above)
-- ═══════════════════════════════════════════════

-- ═══════════════════════════════════════════════
-- Settings Tab
-- ═══════════════════════════════════════════════

local infoLabel = Instance.new("TextLabel")
infoLabel.Size = UDim2.new(1, -20, 0, 50)
infoLabel.Position = UDim2.new(0, 10, 0, 10)
infoLabel.BackgroundTransparency = 1
infoLabel.Text = "Authentication is handled by the local Node.js server using Open Cloud API.\nMake sure your OPEN_CLOUD_API_KEY in the .env file has 'Asset Creation' permission enabled."
infoLabel.Font = Enum.Font.SourceSans
infoLabel.TextColor3 = Theme.Text
infoLabel.TextSize = 13
infoLabel.TextWrapped = true
infoLabel.TextXAlignment = Enum.TextXAlignment.Left
infoLabel.Parent = settingsFrame

-- Owner Settings UI
local toggleOwnerBtn = createButton(settingsFrame, "Upload Owner: User (Click to Toggle)", 70)

local ownerIdBox = Instance.new("TextBox")
ownerIdBox.Size = UDim2.new(1, -20, 0, 25)
ownerIdBox.Position = UDim2.new(0, 10, 0, 105)
ownerIdBox.BackgroundColor3 = Theme.ButtonBg
ownerIdBox.BorderColor3 = Theme.Border
ownerIdBox.BorderSizePixel = 1
ownerIdBox.Text = ""
ownerIdBox.PlaceholderText = "Enter Group ID here..."
ownerIdBox.Font = Enum.Font.SourceSans
ownerIdBox.TextColor3 = Theme.Text
ownerIdBox.TextSize = 14
ownerIdBox.Visible = false
ownerIdBox.Parent = settingsFrame

toggleOwnerBtn.MouseButton1Click:Connect(function()
	if ownerUploadMode == "User" then
		ownerUploadMode = "Group"
		toggleOwnerBtn.Text = "Upload Owner: Group (Click to Toggle)"
		ownerIdBox.Visible = true
	else
		ownerUploadMode = "User"
		toggleOwnerBtn.Text = "Upload Owner: User (Click to Toggle)"
		ownerIdBox.Visible = false
	end
end)

ownerIdBox.FocusLost:Connect(function()
	ownerUploadId = ownerIdBox.Text
end)

print("[ReuploaderMt7Asset v1.0] Plugin loaded! Ready for high-speed uploads.")