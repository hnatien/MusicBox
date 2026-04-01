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

## Prerequisites

- Node.js 20 or higher
- FFmpeg (installed on system or via `ffmpeg-static`)
- Redis server (for queue management)
- Discord Bot Token via [Discord Developer Portal](https://discord.com/developers/applications)

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Configure environment variables
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and provide at least `DISCORD_TOKEN` and `CLIENT_ID`.

3. Register slash commands
   ```bash
   # Registers commands globally or to DEV_GUILD_ID if set
   npm run deploy-commands
   ```

## Running the Bot

### Development
Runs the bot with `tsx watch` for hot reloading.
```bash
npm run dev
```

### Production
Build the TypeScript source and run the compiled JavaScript.
```bash
npm run build
npm start
```

### Docker
Ensure Docker and Docker Compose are installed.
```bash
docker build -t musicbox .
docker run -d --env-file .env musicbox
```

## Available Commands

- `/play` — Play music from YouTube URL or search query
- `/nowplaying` — Show current song details
- `/queue` — View the current song queue
- `/skip` — Skip the current song
- `/stop` — Stop playback and clear the queue
- `/pause` / `/resume` — Control playback
- `/repeat` — Toggle repeat mode
- `/search` — Search and select from results
- `/help` — List all available commands
