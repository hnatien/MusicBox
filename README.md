# Music Box

A Discord music bot for playing music from YouTube with search, queue management, and interactive playback controls. Built with TypeScript and discord.js v14.

## Features

- Play audio from YouTube URLs, search queries, playlists, and Mixes
- Search YouTube and select from top results via dropdown menu
- Per-guild queue with pagination and total duration display
- Interactive Now Playing controls (Pause/Resume, Skip, Stop buttons)
- Real-time progress bar updates every 15 seconds
- Volume control (1–100)
- Auto-disconnect on inactivity or empty voice channel
- YouTube cookie support to bypass rate limits
- In-memory metadata cache with LRU eviction

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0.0
- [FFmpeg](https://ffmpeg.org/) installed and available in PATH
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and available in PATH
- A Discord bot token from the [Developer Portal](https://discord.com/developers)

## Getting Started

```bash
npm install
cp .env.example .env
# Edit .env with your DISCORD_TOKEN and CLIENT_ID
npm run deploy-commands
npm run dev
```

## Configuration

All configuration is managed through environment variables. See `.env.example` for the full list.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | Yes | — | Bot token from Discord Developer Portal |
| `CLIENT_ID` | Yes | — | Application client ID |
| `DEV_GUILD_ID` | No | — | Guild ID for faster command registration during development |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `DEFAULT_VOLUME` | No | `50` | Default playback volume (1–100) |
| `MAX_QUEUE_SIZE` | No | `100` | Maximum number of songs per guild queue |
| `INACTIVITY_TIMEOUT` | No | `300` | Seconds of inactivity before auto-disconnect |
| `YOUTUBE_BROWSER` | No | — | Browser to extract cookies from (`chrome`, `edge`, `brave`, `firefox`) |
| `YOUTUBE_COOKIE` | No | — | Manual cookie string fallback for YouTube |

## Commands

### Music

| Command | Description |
| --- | --- |
| `/play <query>` | Play a song by URL or search term |
| `/search <query>` | Search YouTube and pick from results |
| `/skip` | Skip the current song |
| `/stop` | Stop playback and clear the queue |
| `/pause` | Pause the current song |
| `/resume` | Resume playback |
| `/volume [level]` | Set or view playback volume |
| `/queue [page]` | View the song queue |
| `/nowplaying` | Show the currently playing song |

### Utility

| Command | Description |
| --- | --- |
| `/ping` | Show bot latency |
| `/help` | List all available commands |
| `/update` | View the latest bot updates |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start in development mode with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm run deploy-commands` | Register slash commands with Discord |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint and auto-fix source files |
| `npm run format` | Format source files with Prettier |

## Tech Stack

- **[discord.js](https://discord.js.org/) v14** — Discord API client
- **[@discordjs/voice](https://discord.js.org/docs/packages/voice/stable)** — Voice connections and audio playback
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** via youtube-dl-exec — YouTube audio extraction
- **[youtube-sr](https://github.com/DevAndromeda/youtube-sr)** — YouTube search
- **[FFmpeg](https://ffmpeg.org/)** + opusscript — Audio transcoding and Opus encoding
- **[Winston](https://github.com/winstonjs/winston)** — Structured logging
- **[Vitest](https://vitest.dev/)** — Testing framework

## License

ISC
