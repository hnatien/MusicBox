<p align="center">
  <h1 align="center">🎵 MusicBox</h1>
  <p align="center">A self-hosted Discord music bot with YouTube playback, queue management, and playlist support.</p>
  <p align="center">
    <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white" alt="discord.js">
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/license-ISC-blue?style=flat-square" alt="License">
  </p>
</p>

---

## Features

- Play from YouTube URLs or search queries (single tracks, playlists, Mixes)
- Interactive search with selectable results
- Per-guild queue with pagination and volume control
- Now playing embed with live progress bar
- Auto-disconnect on inactivity or empty voice channel
- YouTube cookie support to bypass rate limits

## Prerequisites

- Node.js >= 20
- A Discord bot token — [Developer Portal](https://discord.com/developers/applications)
- FFmpeg — bundled via `ffmpeg-static`, no manual install needed

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DISCORD_TOKEN and CLIENT_ID at minimum

# 3. Register slash commands
npm run deploy-commands

# 4. Start
npm run dev
```

## Configuration

| Variable | Required | Default | Description |
|---|:---:|:---:|---|
| `DISCORD_TOKEN` | ✅ | — | Bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | — | Application client ID |
| `DEV_GUILD_ID` | — | — | Guild ID for instant command updates during development |
| `LOG_LEVEL` | — | `info` | `debug` · `info` · `warn` · `error` |
| `DEFAULT_VOLUME` | — | `50` | Initial playback volume (1–100) |
| `MAX_QUEUE_SIZE` | — | `100` | Max songs per guild queue |
| `INACTIVITY_TIMEOUT` | — | `300` | Seconds of inactivity before auto-disconnect |
| `YOUTUBE_COOKIE` | — | — | Cookie string to bypass YouTube rate limits |

## Commands

| Command | Description |
|---|---|
| `/play <query>` | Play by URL or search term — supports playlists and YouTube Mixes |
| `/search <query>` | Search YouTube and pick from top 5 results |
| `/nowplaying` | Show current track with progress bar |
| `/queue [page]` | View the song queue (10 per page) |
| `/skip` | Skip the current track |
| `/pause` / `/resume` | Pause or resume playback |
| `/volume <1-100>` | Set playback volume |
| `/stop` | Stop playback and clear the queue |
| `/ping` | Show bot latency |
| `/help` | List all available commands |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload (development) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm run deploy-commands` | Register slash commands with Discord |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` | Format source files with Prettier |

## Docker

```bash
# Build
docker build -t musicbox:latest .

# Run
docker run --rm --env-file .env musicbox:latest
```

The image bundles `python3` and `ffmpeg` — no host dependencies needed.

**Railway:** Leave _Pre-deploy Command_ and _Custom Start Command_ empty. Enable teardown to prevent overlapping instances during deploys.

## License

[ISC](LICENSE)
