# m-spoofer 🔥

**Roblox Asset Reuploader Plugin + Server**

> Credit: **mt7s m-project**

---

## What is this?

m-spoofer is a Roblox Studio plugin paired with a local Node.js server that lets you reupload assets (Animations, Meshes, Audio, Images) to your own account using the Roblox Open Cloud API. It also scans inside Scripts to find and replace asset IDs automatically.

### Supported Asset Types

| Type | Format |
|------|--------|
| Animation | `model/x-rbxm` |
| Mesh | `model/x-file-mesh-data` |
| Audio | `audio/ogg` |
| Image / Decal | `image/png` |

---

## Setup

### 1. Install Node.js

Download and install [Node.js](https://nodejs.org/) (v18 or later).

### 2. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/m-spoofer.git
cd m-spoofer
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure `.env`

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
OPEN_CLOUD_API_KEY="your_api_key"
ROBLOX_CREATOR_ID="your_user_id"
ROBLOX_CREATOR_TYPE="User"
DOWNLOAD_CONCURRENCY=8
```

**How to get your API Key:**
1. Go to [Roblox Creator Dashboard](https://create.roblox.com/dashboard/credentials)
2. Create an API Key with **Assets API** permission (Read + Write)
3. Copy the key into your `.env` file

### 5. Start the server

```bash
npm start
```

The server will run on `http://127.0.0.1:3000`.

### 6. Install the Plugin

Copy `AssetReuploader.lua` to your Roblox Studio Plugins folder:

- **Windows:** `%LOCALAPPDATA%\Roblox\Plugins\`
- **Mac:** `~/Documents/Roblox/Plugins/`

Restart Roblox Studio. You will see the **m-spoofer** button in the toolbar.

---

## Features

- **Animation Reuploader** — Scan and reupload all animations
- **Mesh Reuploader** — Scan and reupload all meshes (supports MeshPart + SpecialMesh)
- **Audio Reuploader** — Scan and reupload all sounds
- **Image Reuploader** — Scan and reupload all images/decals/textures
- **Script Scanning** — Automatically finds and replaces asset IDs inside Scripts, LocalScripts, and ModuleScripts
- **Replace Log** — View a history of all replaced asset IDs
- **Owner Settings** — Toggle between uploading as User or Group directly from the plugin UI
- **Parallel Downloads** — Downloads multiple assets simultaneously for speed

---

## How it Works

1. The plugin scans your game for assets of the selected type
2. It sends the asset IDs to the local Node.js server
3. The server downloads each asset from Roblox CDN
4. The server re-uploads each asset to your account via Open Cloud API
5. The plugin receives the new IDs and replaces them in your game

---

## License

ISC

---

**Credit: mt7s m-project**
# reploudermt7Asset
