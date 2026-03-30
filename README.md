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

- [Node.js](https://nodejs.org/) 22.x
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
| `YOUTUBE_COOKIE_FILE` | No | -- | Path to Netscape cookie file (recommended for production/Docker) |
| `YOUTUBE_BROWSER` | No | -- | Browser to extract cookies from (`chrome`, `edge`, `brave`, `firefox`) |
| `YOUTUBE_COOKIE` | No | -- | Manual cookie string fallback for YouTube |

Cookie priority order used by the bot:
1. `YOUTUBE_COOKIE_FILE`
2. `YOUTUBE_BROWSER`
3. `YOUTUBE_COOKIE`

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

## Production with Docker

1. Build and run in background:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

2. View logs:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

3. Stop service:

```bash
docker compose -f docker-compose.prod.yml down
```

### Cookie Best Practice (Auto Refresh)

For Docker/production, prefer a cookie file instead of `YOUTUBE_BROWSER`.

1. Export `youtube.com` cookies to Netscape format on host machine.
2. Store as a file, for example `./secrets/youtube-cookies.txt`.
3. Mount that file into container and set `YOUTUBE_COOKIE_FILE` to mounted path.
4. Refresh the file periodically (for example every 6-24h) with a host-side script/task.

Why: browser profiles are usually unavailable inside container, so `--cookies-from-browser brave` often fails with missing cookie database.

### Auto Refresh on Windows

1. Leave this in `.env`:

```env
YOUTUBE_COOKIE_FILE=/run/secrets/youtube-cookies.txt
YOUTUBE_BROWSER=
```

2. Refresh cookie file from host browser profile:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\refresh-youtube-cookies.ps1 -Browser brave
```

3. Schedule the refresh (example every 12h):

```powershell
schtasks /Create /SC HOURLY /MO 12 /TN "MusicBox Refresh YouTube Cookies" /TR "powershell -ExecutionPolicy Bypass -File D:\Projects\MusicBox\scripts\refresh-youtube-cookies.ps1 -Browser brave" /F
```

Notes:
- You still need to sign in YouTube on that browser profile.
- Cookie refresh runs on host machine, not inside container.
- Bot reads cookie file on each stream request, so container restart is not required after refresh.

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
