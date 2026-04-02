# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MusicBox is a Discord music bot built with TypeScript and discord.js v14. It plays audio from YouTube with queue management, playback controls, and supports playlists and YouTube Mixes.

## Commands

```bash
npm run dev              # Development with hot reload (tsx watch)
npm run build            # Compile TypeScript to dist/
npm start                # Run production build (node dist/index.js)
npm run deploy-commands  # Register slash commands globally or per DEV_GUILD_ID
npm run lint             # ESLint with auto-fix
npm run format           # Prettier formatting
```

Vitest is configured but no tests exist yet. There is no single-test runner command currently in use.

## Required Environment Variables

All config is validated at startup in `src/config/environment.ts` and exported as `config`. Copy `.env.example` and populate:

**Required:**
- `DISCORD_TOKEN` — bot token
- `CLIENT_ID` — application client ID

**Redis** (defaults to `localhost:6379`):
- `REDISHOST` / `REDISPORT` / `REDISUSER` / `REDISPASSWORD` (or `REDIS_PASSWORD`)

**Optional:**
- `DEV_GUILD_ID` — guild-specific command deployment during development
- `YOUTUBE_COOKIE` — bypasses YouTube rate limits
- `FFMPEG_BINARY` — defaults to auto-detecting ffmpeg-static or system ffmpeg
- `ADMIN_IDS` — comma-separated Discord user IDs for admin panel access
- `CLIENT_SECRET` / `ADMIN_REDIRECT_URI` — Discord OAuth for admin panel login
- `PORT` — web server port (default `3000`)
- `LOG_LEVEL` — winston log level (default `info`)
- `DEFAULT_VOLUME`, `MAX_QUEUE_SIZE`, `INACTIVITY_TIMEOUT`, `YT_METADATA_TIMEOUT_MS`, `YT_PLAYLIST_TIMEOUT_MS`, `YT_STREAM_TIMEOUT_MS` — tuneable defaults

## Architecture

### Entry Point & Client
- `src/index.ts` — starts the bot, calls loaders for commands and events, handles graceful shutdown
- `src/core/client.ts` — extends `discord.js Client` with a `commands: Collection<string, Command>` map

### Dynamic Loaders
- `src/commands/index.ts` — scans subdirectories, imports each file, registers in `client.commands`
- `src/events/index.ts` — scans directory, calls `client.on()` or `client.once()` based on `BotEvent.once`

### Command Pattern
Each command file is a default export implementing `Command` (`src/models/command.ts`):
```typescript
{ data: SlashCommandBuilder, cooldown?: number, execute(interaction, client), autocomplete?(interaction) }
```

### Event Pattern
Each event file is a default export implementing `BotEvent<K extends keyof ClientEvents>`:
```typescript
{ name: K, once?: boolean, execute(...args) }
```

### Service Layer

**`queueManager.ts`** — owns per-guild state (Map of guildId → GuildQueue). GuildQueue holds: songs array, current song, VoiceConnection, AudioPlayer, volume, inactivity timer, and Mix context.

**`musicPlayer.ts`** — handles voice connection creation, AudioResource creation, playback loop (`play()` auto-advances on `AudioPlayer Idle`), progress updates (15s interval), and inactivity auto-disconnect.

**`youtubeService.ts`** — YouTube search (youtube-sr with yt-dlp fallback), metadata extraction via yt-dlp subprocess, metadata LRU cache (60min TTL, 500 entries), and audio stream delivery via yt-dlp → FFmpeg pipeline in PCM S16LE 48kHz format.

**`database.ts`** — Redis client singleton (`database`). Stores: `totalSongsPlayed` counter and `session:<sid>` keys (TTL-backed admin sessions). Degrades gracefully when Redis is unavailable.

**`webServer.ts`** — Express server serving `public/` static files plus:
- `GET /health`, `GET /api/stats` — public endpoints
- `GET /admin/login|callback|logout` — Discord OAuth flow (requires `CLIENT_SECRET` + `ADMIN_REDIRECT_URI`)
- `GET /api/admin/stats`, `POST /api/admin/maintenance` — protected by `mb_admin_sid` cookie session; only users in `ADMIN_IDS` can log in

### Key Data Flow: Playing a Song
```
/play command → interactionCreate (cooldown check) → play.execute()
  → youtubeService.searchByQuery() or getInfoByUrl()
  → queueManager.addSong() → musicPlayer.play()
  → youtubeService.getAudioStream() → yt-dlp → FFmpeg → AudioResource
  → AudioPlayer emits Idle → next song or inactivity timer
```

### YouTube Mix Support
Mixes (URLs with `list=RD`) are handled specially: first song plays immediately, subsequent songs are fetched lazily via `queueManager.getNextMixSong()`.

### Cooldowns
Implemented in `src/events/interactionCreate.ts` using a per-command `Collection<userId, timestamp>` map. Each command's `cooldown` field (seconds) is checked before `execute()`.

### Slash Command Deployment
Run `npm run deploy-commands` separately from the bot. When `DEV_GUILD_ID` is set, commands register to that guild only (instant); without it, they register globally (up to 1 hour to propagate).

## Key Constants & Utilities

- `src/config/environment.ts` — single source of truth for all runtime config; import `config` from here
- `src/core/logger.ts` — Winston logger; use `logger.info/warn/error()` instead of `console.log`
- `src/utils/constants.ts` — embed colors (`PRIMARY`, `SUCCESS`, `WARNING`, `ERROR`, `NOW_PLAYING`), emoji strings
- `src/utils/embed.ts` — all Discord embed builders (9 functions); use these instead of constructing raw embeds
- `src/utils/validation.ts` — regex-based YouTube URL/playlist/mix detection

## Docker / Deployment

Multi-stage Dockerfile: deps (Node 22 + python3 + ffmpeg) → build (tsc) → runner (slim, non-root `node` user, tini as PID 1). For Railway: leave pre-deploy and custom start commands empty; enable teardown to prevent overlapping instances.
