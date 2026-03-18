<div align="center">

# 🎵 Music Box

**A feature-rich Discord music bot for playing YouTube audio with search, queue management, and interactive playback controls.**

Built with TypeScript · discord.js v14 · Slash Commands

[![Node.js](https://img.shields.io/badge/Node.js-≥20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

</div>

---

## 📖 Table of Contents

- [Features](#-features)
- [Demo](#-demo)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Configuration](#%EF%B8%8F-configuration)
- [Commands](#-commands)
- [Architecture](#-architecture)
- [Scripts](#-scripts)
- [Tech Stack](#-tech-stack)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

| Feature | Description |
| --- | --- |
| 🎶 **YouTube Playback** | Play audio from URLs, search queries, playlists, and Mixes |
| 🔎 **Interactive Search** | Search YouTube and select from top results via dropdown menu |
| 📜 **Queue Management** | Per-guild queue with pagination and total duration display |
| 🎛️ **Now Playing Controls** | Interactive buttons — Pause/Resume, Skip, Stop |
| 📊 **Live Progress Bar** | Real-time progress bar updates every 15 seconds |
| 🔊 **Volume Control** | Adjustable playback volume (1–100) |
| ⏱️ **Auto-Disconnect** | Automatic disconnect on inactivity or empty voice channel |
| 🍪 **YouTube Cookie Support** | Bypass rate limits with browser cookie extraction |
| ⚡ **Metadata Cache** | In-memory LRU cache (500 entries, 1h TTL) for faster playback |
| 🔄 **Smart Retry** | Automatic stream retry with exponential backoff (up to 3 attempts) |

## 🎬 Demo

```
/play never gonna give you up
```

> 🎵 **Now Playing**
> **[Never Gonna Give You Up](https://youtube.com/watch?v=dQw4w9WgXcQ)**
> Rick Astley
>
> ▬▬▬▬🔘▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
> `1:12 / 3:33`
>
> Requested by @you

*Interactive buttons: ⏸️ Pause · ⏭️ Skip · ⏹️ Stop*

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **[Node.js](https://nodejs.org/)** ≥ 20.0.0
- **[FFmpeg](https://ffmpeg.org/)** — installed and available in PATH
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — installed and available in PATH (`pip install yt-dlp`)
- **Discord Bot Token** — from the [Developer Portal](https://discord.com/developers)

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/your-username/MusicBox.git
cd MusicBox
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
```

### 3. Register Slash Commands

```bash
npm run deploy-commands
```

> **Tip:** Set `DEV_GUILD_ID` in `.env` for instant command registration during development. Without it, global deployment can take up to 1 hour to propagate.

### 4. Start the Bot

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

## ⚙️ Configuration

All configuration is managed through environment variables. See [`.env.example`](.env.example) for the full template.

| Variable | Required | Default | Description |
| --- | :---: | :---: | --- |
| `DISCORD_TOKEN` | ✅ | — | Bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | — | Application client ID |
| `DEV_GUILD_ID` | — | — | Guild ID for faster command registration in dev |
| `LOG_LEVEL` | — | `info` | Logging level: `debug` · `info` · `warn` · `error` |
| `DEFAULT_VOLUME` | — | `50` | Default playback volume (1–100) |
| `MAX_QUEUE_SIZE` | — | `100` | Maximum songs per guild queue |
| `INACTIVITY_TIMEOUT` | — | `300` | Seconds of inactivity before auto-disconnect |
| `YOUTUBE_BROWSER` | — | — | Browser to extract cookies from: `chrome` · `edge` · `brave` · `firefox` |
| `YOUTUBE_COOKIE` | — | — | Manual cookie string fallback (not needed if `YOUTUBE_BROWSER` is set) |

## 🎮 Commands

### Music

| Command | Description | Cooldown |
| --- | --- | :---: |
| `/play <query>` | Play a song by YouTube URL, playlist, mix, or search term | 3s |
| `/search <query>` | Search YouTube and pick from results via dropdown | 5s |
| `/skip` | Skip the current song | 2s |
| `/stop` | Stop playback, clear queue, and disconnect | 3s |
| `/pause` | Pause the current song | 2s |
| `/resume` | Resume playback | 2s |
| `/volume [level]` | Set or view playback volume (1–100) | 2s |
| `/queue [page]` | View the song queue with pagination | 3s |
| `/nowplaying` | Show the currently playing song with progress | 3s |

### Utility

| Command | Description | Cooldown |
| --- | --- | :---: |
| `/ping` | Show bot and API latency | 5s |
| `/help` | List all available commands by category | 5s |
| `/update` | View the latest bot changelog | 10s |

## 🏗️ Architecture

```
src/
├── index.ts                  # Entry point — init, login, graceful shutdown
├── config/
│   └── environment.ts        # Env var validation and typed config
├── core/
│   ├── client.ts             # Extended Discord.js Client with command registry
│   └── logger.ts             # Winston structured logging
├── commands/
│   ├── index.ts              # Dynamic command loader (scans subdirectories)
│   ├── music/                # play, search, skip, stop, pause, resume, volume, queue, nowplaying
│   └── utility/              # ping, help, update
├── events/
│   ├── index.ts              # Dynamic event loader
│   ├── interactionCreate.ts  # Routes slash commands + button interactions
│   ├── handleButtons.ts      # Now Playing & Queue button handlers
│   ├── voiceStateUpdate.ts   # Auto-disconnect on empty channel
│   ├── ready.ts              # Bot ready event
│   ├── guildCreate.ts        # Joined guild tracking
│   └── guildDelete.ts        # Left guild tracking
├── services/
│   ├── musicPlayer.ts        # Voice connections, audio playback, progress bar
│   ├── queueManager.ts       # Per-guild FIFO queue (Map<guildId, GuildQueue>)
│   └── youtubeService.ts     # YouTube search, metadata, audio streaming
├── models/
│   ├── command.ts            # Command interface
│   ├── guildQueue.ts         # GuildQueue data model
│   └── song.ts               # Song data model
├── utils/
│   ├── guards.ts             # Reusable validation (voice channel, permissions, queue)
│   ├── components.ts         # Discord button builders
│   ├── embed.ts              # All embed constructors
│   ├── constants.ts          # Colors, emojis, limits
│   ├── formatDuration.ts     # Duration formatting and progress bar
│   └── validation.ts         # YouTube URL validation
├── types/
│   └── index.ts              # Discord.js Client type augmentation
└── scripts/
    └── deploy-commands.ts    # Slash command registration script
```

### Play Flow

```
/play → requireVoiceChannel() → requireBotPermissions()
  → queueManager (create/get queue)
  → youtubeService (resolve metadata)
  → queueManager.addSong()
  → musicPlayer.play()
  → yt-dlp (resolve audio URL)
  → FFmpeg (transcode to s16le, 48kHz, 2ch)
  → createAudioResource()
  → player.play()
  → On idle → auto-play next song
```

### Button Interaction Flow

```
User clicks button → interactionCreate routes to handleButtons
  → Parse customId (prefix:action:guildId[:extra])
  → Now Playing: pause/resume/skip/stop
  → Queue: page navigation
  → Update message embed + buttons
```

## 📜 Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start in development mode with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm run deploy-commands` | Register slash commands with Discord API |
| `npm test` | Run all tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint and auto-fix source files (ESLint) |
| `npm run format` | Format source files with Prettier |

## 🛠️ Tech Stack

| Technology | Purpose |
| --- | --- |
| [**discord.js**](https://discord.js.org/) v14 | Discord API client |
| [**@discordjs/voice**](https://discord.js.org/docs/packages/voice/stable) | Voice connections and audio playback |
| [**yt-dlp**](https://github.com/yt-dlp/yt-dlp) via youtube-dl-exec | YouTube audio extraction |
| [**youtube-sr**](https://github.com/DevAndromeda/youtube-sr) | YouTube search |
| [**FFmpeg**](https://ffmpeg.org/) + opusscript | Audio transcoding and Opus encoding |
| [**Winston**](https://github.com/winstonjs/winston) | Structured logging with levels and timestamps |
| [**TypeScript**](https://www.typescriptlang.org/) 5.9 | Type-safe development |
| [**Vitest**](https://vitest.dev/) | Testing framework |
| [**ESLint**](https://eslint.org/) + [**Prettier**](https://prettier.io/) | Code quality and formatting |

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/your-username/MusicBox.git
   ```
3. **Create** a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make** your changes and ensure tests pass:
   ```bash
   npm test
   ```
5. **Commit** your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. **Push** to your branch:
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open** a Pull Request

## 📄 License

This project is licensed under the **ISC License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ and 🎵

**[⬆ Back to Top](#-music-box)**

</div>
