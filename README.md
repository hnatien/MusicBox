<p align="center">
  <h1 align="center">🎵 MusicBox</h1>
  <p align="center">A high-performance Discord music bot built with TypeScript, featuring advanced queue management, visual UI, and YouTube support.</p>
  <p align="center">
    <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white" alt="discord.js">
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/Redis-6.x%2B-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis">
    <img src="https://img.shields.io/badge/license-ISC-blue?style=flat-square" alt="License">
  </p>
</p>

---

## Features

- **Sophisticated Playback**: Play from YouTube URLs, search queries, playlists, and YouTube Mixes (lazy loading).
- **Visual UI**: Dynamic, high-quality PNG generation for the /help command via Canvas components.
- **Queue Management**: Per-guild queues with pagination, volume control, and shuffle/repeat modes.
- **Persistence**: Global statistics tracking (total songs played) using Redis.
- **Admin Dashboard**: Built-in Express web server for status monitoring and administration.
- **Resource Management**: Auto-disconnect on inactivity (5 mins) or empty voice channel.
- **Now Playing**: Rich embeds with real-time progress bars and track metadata.
- **Maintenance Tools**: Support for update check and maintenance mode through admin-only commands.

## Prerequisites

- **Node.js**: >= 20.x
- **Redis**: Required for statistics and state management.
- **Discord Bot Token**: From the [Developer Portal](https://discord.com/developers/applications).
- **FFmpeg**: Bundled via ffmpeg-static, no manual installation required.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DISCORD_TOKEN, CLIENT_ID, and REDIS_URL at minimum

# 3. Register slash commands
npm run deploy-commands

# 4. Start Development
npm run dev
```

## Configuration

| Variable | Required | Default | Description |
|---|:---:|:---:|---|
| `DISCORD_TOKEN` | ✅ | — | Bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | — | Application client ID |
| `REDIS_URL` | ✅ | — | Redis connection URI (e.g. `redis://localhost:6379`) |
| `DEV_GUILD_ID` | — | — | Guild ID for instant command updates during development |
| `ADMIN_IDS` | — | — | Comma-separated list of Discord user IDs for restricted commands |
| `PORT` | — | `3000` | Port for the internal web server |
| `LOG_LEVEL` | — | `info` | Logging detail: `debug` · `info` · `warn` · `error` |
| `DEFAULT_VOLUME` | — | `50` | Initial playback volume (1–100) |
| `MAX_QUEUE_SIZE` | — | `100` | Max songs per guild queue |
| `INACTIVITY_TIMEOUT` | — | `300` | Seconds before auto-disconnect |
| `YOUTUBE_COOKIE` | — | — | Cookie string to bypass YouTube rate limits |

## Commands

### Music
| Command | Description |
|---|---|
| `/play <query>` | Play by URL or search term (supports playlists & YouTube Mixes) |
| `/search <query>` | Search YouTube and choose from top 5 results |
| `/nowplaying` | Show currently playing track with live progress bar |
| `/queue [page]` | View the current song queue (10 per page) |
| `/skip` | Skip the current track |
| `/pause` / `/resume` | Pause or resume playback |
| `/volume <1-100>` | Adjust current playback volume |
| `/stop` | Stop playback and clear the queue |
| `/repeat <mode>` | Toggle repeat: `off` · `track` · `queue` |

### Utility
| Command | Description |
|---|---|
| `/help` | Display interactive visual command guide |
| `/ping` | Show bot and API latency |
| `/maintenance` | [Admin] Toggle maintenance mode |
| `/update` | [Admin] Check for bot updates |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload (development via tsx) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run the production build |
| `npm run deploy-commands` | Register slash commands global or per-guild |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` | Prettier code formatting |

## Docker

```bash
# Build
docker build -t musicbox:latest .

# Run
docker run --rm --env-file .env musicbox:latest
```

The image bundles node-22-slim, python3, and ffmpeg — everything required is inside the container.

## License

[ISC](LICENSE)
