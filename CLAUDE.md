# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start with hot reload (tsx watch)
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled production build
npm run deploy-commands  # Register slash commands with Discord API
npm run lint             # ESLint with auto-fix on src/
npm run format           # Prettier formatting on src/
npm test                 # Run all tests (vitest)
npm run test:watch       # Run tests in watch mode
npx vitest run tests/utils/embed.test.ts  # Run a single test file
```

ESLint is v10 and requires `eslint.config.js` (flat config), but the project still uses the old `.eslintrc` format — `npm run lint` currently fails. TypeScript checking: `./node_modules/.bin/tsc --noEmit`.

## Architecture

MusicBox is a Discord music bot (discord.js v14, TypeScript, ES modules) with a layered architecture:

**Entry point**: `src/index.ts` — initializes `MusicClient`, dynamically loads commands/events, handles graceful shutdown.

**Core layer** (`src/core/`):
- `client.ts` — Extends `discord.js Client` with command registry (`Collection`) and `updatePresence()`. Only subscribes to `Guilds` + `GuildVoiceStates` intents.
- `logger.ts` — Winston-based structured logger.

**Command system** (`src/commands/`): Dynamic loader scans subdirectories and registers commands. Each command exports `{ data: SlashCommandBuilder, execute(), cooldown?, autocomplete?, category? }`. Music commands in `commands/music/`, utility in `commands/utility/`. The loader sets `category` from the directory name.

**Event system** (`src/events/`): Dynamic loader. Key events:
- `interactionCreate` — Routes both slash commands and button interactions. Enforces per-user/per-command cooldowns.
- `handleButtons.ts` — Handles Now Playing buttons (`np:pause`, `np:resume`, `np:skip`, `np:stop`) and Queue pagination buttons (`queue:page`). Button customIds use the format `prefix:action:guildId[:extra]`.
- `voiceStateUpdate` — Auto-disconnect when voice channel empties.

**Service layer** (`src/services/`):
- `queueManager.ts` — `Map<guildId, GuildQueue>` in memory. FIFO queue, max queue size, `mixContext` for lazy-loading YouTube Mixes.
- `musicPlayer.ts` — Voice connections, audio playback via `@discordjs/voice`, inactivity timer (auto-disconnect), progress bar updates (edits "now playing" message every 15s with buttons). Exports `getElapsedSeconds()` and `updateNowPlayingMessage()` for external sync.
- `youtubeService.ts` — YouTube search via `youtube-sr`, audio extraction via `yt-dlp` + FFmpeg (s16le, 48kHz, 2-channel). Metadata cached with 1-hour TTL, LRU eviction (up to 500 entries). 30s process timeout on yt-dlp spawns.

**Shared utilities** (`src/utils/`):
- `guards.ts` — Reusable validation: `requireVoiceChannel()`, `requireBotPermissions()`, `requireQueue()`, `requirePlaying()`. All music commands use these instead of inline checks.
- `components.ts` — Button builders: `createNowPlayingButtons()` (pause/resume, skip, stop) and `createQueueButtons()` (pagination).
- `embed.ts` — All Discord embed constructors. `createNowPlayingEmbed()` accepts `isPaused` to toggle title. `createQueueEmbed()` accepts optional `totalDuration`.

**Data model** (`src/models/guildQueue.ts`): `GuildQueue` holds voice connection, audio player, song array, current song, volume (0–1 internally, 1–100 to users), playback timestamps, inactivity/progress timers, and optional `mixContext`.

## Play Flow

`/play` → `requireVoiceChannel()` + `requireBotPermissions()` → `queueManager` creates/gets guild queue → `youtubeService` resolves metadata (URL or search) → `queueManager.addSong()` → `musicPlayer.play()` → yt-dlp resolves audio URL → FFmpeg transcodes → `createAudioResource()` → `player.play()`. On `AudioPlayerStatus.Idle`, next song is auto-played. Playback failures use a skip counter to prevent infinite recursion.

## Button Interaction Flow

Now Playing messages include Pause/Resume, Skip, Stop buttons. Queue messages include pagination buttons when multi-page. `interactionCreate` routes `interaction.isButton()` to `handleButtons.ts`, which parses `customId` (`prefix:action:guildId[:page]`) and performs the action. Slash commands like `/pause` and `/resume` call `updateNowPlayingMessage()` to keep button state in sync.

## Environment Variables

Required: `DISCORD_TOKEN`, `CLIENT_ID`. See `.env.example` for all options including `DEFAULT_VOLUME`, `MAX_QUEUE_SIZE`, `INACTIVITY_TIMEOUT`, and YouTube cookie config (`YOUTUBE_BROWSER`, `YOUTUBE_COOKIE`).

Config is validated at startup in `src/config/environment.ts`.
