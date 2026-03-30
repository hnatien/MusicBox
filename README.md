# Music Box

A Discord bot for playing music from YouTube with search, queue management, and playback controls. Built with TypeScript and discord.js v14.

## Features

- Play audio from YouTube URLs or search queries
- Search YouTube and select from top results
- Per-guild queue with add, skip, remove, and pagination
- Playback controls: pause, resume, stop, volume
- Now playing display with progress bar
- Auto-disconnect on inactivity or empty voice channel
- YouTube cookie support to bypass rate limits

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0.0
- [FFmpeg](https://ffmpeg.org/) installed and available in PATH
- A Discord bot token from the [Developer Portal](https://discord.com/developers)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Configure required variables in `.env`:

```
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
```

4. Register slash commands:

```bash
npm run deploy-commands
```

5. Start the bot:

```bash
npm run dev
```

## Docker Deployment

This repository includes a production-ready `Dockerfile` with required system dependencies (`python3` and `ffmpeg`) for `yt-dlp` playback.

1. Build image:

```bash
docker build -t music-box:latest .
```

2. Run container:

```bash
 docker run --rm --name music-box --env-file .env music-box:latest
```

3. For Railway:

- If Railway is using this `Dockerfile`, leave `Pre-deploy Command` empty
- If Railway is using this `Dockerfile`, leave `Custom Start Command` empty
- The image already handles build and startup via `RUN npm run build` and `CMD ["node", "dist/index.js"]`
- Enable teardown to avoid overlapping bot instances during rollout

## Configuration

All configuration is managed through environment variables. See `.env.example` for the full list.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | Yes | -- | Bot token from Discord Developer Portal |
| `CLIENT_ID` | Yes | -- | Application client ID |
| `DEV_GUILD_ID` | No | -- | Guild ID for faster command registration during development |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `DEFAULT_VOLUME` | No | `50` | Default playback volume (1-100) |
| `MAX_QUEUE_SIZE` | No | `100` | Maximum number of songs per guild queue |
| `INACTIVITY_TIMEOUT` | No | `300` | Seconds of inactivity before auto-disconnect |
| `YOUTUBE_COOKIE` | No | -- | Manual cookie string fallback for YouTube |

## Commands

| Command | Description |
| --- | --- |
| `/play <query>` | Play a song by URL or search term |
| `/search <query>` | Search YouTube and pick from results |
| `/skip` | Skip the current song |
| `/stop` | Stop playback and clear the queue |
| `/pause` | Pause the current song |
| `/resume` | Resume playback |
| `/volume <1-100>` | Set playback volume |
| `/queue [page]` | View the song queue |
| `/nowplaying` | Show the currently playing song |
| `/ping` | Show bot latency |
| `/help` | List all available commands |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start in development mode with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm run deploy-commands` | Register slash commands with Discord |
| `npm run lint` | Lint and auto-fix source files |
| `npm run format` | Format source files with Prettier |

## Tech Stack

- **TypeScript** -- Language
- **discord.js v14** -- Discord API client
- **@discordjs/voice** -- Voice connections and audio playback
- **youtube-dl-exec** -- YouTube audio extraction
- **youtube-sr** -- YouTube search
- **Winston** -- Structured logging
- **FFmpeg** -- Audio processing
- **opusscript** -- Opus encoding for Discord voice

## Project Structure

```
src/
├── index.ts                   # Entry point
├── config/
│   └── environment.ts         # Environment variable validation
├── core/
│   ├── client.ts              # Extended Discord client
│   └── logger.ts              # Winston logger setup
├── commands/
│   ├── index.ts               # Command loader and registry
│   ├── music/
│   │   ├── play.ts            # Play by URL or search term
│   │   ├── search.ts          # Interactive YouTube search
│   │   ├── skip.ts            # Skip current track
│   │   ├── stop.ts            # Stop and clear queue
│   │   ├── pause.ts           # Pause playback
│   │   ├── resume.ts          # Resume playback
│   │   ├── volume.ts          # Volume control
│   │   ├── queue.ts           # View queue with pagination
│   │   └── nowplaying.ts      # Current track info
│   └── utility/
│       ├── ping.ts            # Latency check
│       └── help.ts            # Command listing
├── events/
│   ├── index.ts               # Event loader
│   ├── ready.ts               # Bot ready handler
│   ├── interactionCreate.ts   # Command interaction router
│   └── voiceStateUpdate.ts    # Voice channel state tracking
├── services/
│   ├── musicPlayer.ts         # Audio stream and playback logic
│   ├── queueManager.ts        # Per-guild queue state management
│   └── youtubeService.ts      # YouTube search and stream extraction
├── models/
│   ├── command.ts             # Command interface
│   ├── song.ts                # Song data model
│   └── guildQueue.ts          # Guild queue data model
├── types/                     # Shared type definitions
└── utils/
    ├── constants.ts           # Application constants
    ├── embed.ts               # Discord embed builders
    ├── formatDuration.ts      # Duration formatting helpers
    └── validation.ts          # Input validation utilities
```

## License

ISC
