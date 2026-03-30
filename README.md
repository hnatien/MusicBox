# Music Box

Discord music bot built with TypeScript and discord.js v14.

Music Box supports YouTube playback, search, queue management, and interactive now-playing controls.

## Features

- Play from YouTube URLs, search queries, playlists, and mixes
- Interactive `/search` command with result selection
- Per-guild queue with pagination
- Playback controls: pause, resume, skip, stop, volume
- Now-playing message with live progress updates
- Auto-disconnect when voice channel is empty or idle
- Cookie-based YouTube access fallback

## Tech Stack

- Node.js 22
- TypeScript 5
- discord.js v14
- @discordjs/voice
- youtube-sr
- yt-dlp
- FFmpeg
- Winston

## Requirements

- Docker and Docker Compose plugin
- Discord bot token and client ID

No local FFmpeg or yt-dlp installation is required when running with Docker.

## Quick Start (Docker Only)

1. Clone and enter the repository.

```bash
git clone https://github.com/your-username/MusicBox.git
cd MusicBox
```

2. Create environment file.

```bash
cp .env.example .env
```

3. Set required variables in `.env`.

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
```

4. Build and start container.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

5. Check logs.

```bash
docker compose -f docker-compose.prod.yml logs -f
```

6. Register slash commands (run once after first deploy, or when commands change).

```bash
docker compose -f docker-compose.prod.yml run --rm musicbox npm run deploy-commands
```

7. Stop service.

```bash
docker compose -f docker-compose.prod.yml down
```

## Environment Variables

All configuration is managed through environment variables.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | Yes | - | Discord bot token |
| `CLIENT_ID` | Yes | - | Discord application client ID |
| `DEV_GUILD_ID` | No | - | Faster guild-scoped command registration for development |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |
| `DEFAULT_VOLUME` | No | `50` | Default volume (1-100) |
| `MAX_QUEUE_SIZE` | No | `100` | Max songs in queue per guild |
| `INACTIVITY_TIMEOUT` | No | `300` | Seconds before auto-disconnect |
| `YOUTUBE_COOKIE_FILE` | No | - | Path to Netscape cookie file |
| `YOUTUBE_BROWSER` | No | - | Browser cookie extraction (`chrome`, `edge`, `brave`, `firefox`) |
| `YOUTUBE_COOKIE` | No | - | Manual cookie header fallback |

Cookie resolution priority in code:

1. `YOUTUBE_COOKIE_FILE`
2. `YOUTUBE_BROWSER`
3. `YOUTUBE_COOKIE`

## Cookie Setup for Docker

Recommended in containers: use `YOUTUBE_COOKIE` or mount a cookie file.

### Option A: Use `YOUTUBE_COOKIE` string (simple)

Set this directly in `.env`:

```env
YOUTUBE_COOKIE=APISID=...; SID=...; ...
```

### Option B: Use `YOUTUBE_COOKIE_FILE` (Netscape format)

1. Save cookie file on host, for example: `./secrets/youtube-cookies.txt`
2. Add this to `.env`:

```env
YOUTUBE_COOKIE_FILE=/run/secrets/youtube-cookies.txt
```

3. Mount into container by editing `docker-compose.prod.yml`:

```yaml
services:
  musicbox:
    volumes:
      - ./secrets:/run/secrets:ro
```

## Commands

### Music

- `/play <query>`: play song by URL or search term
- `/search <query>`: search and choose result
- `/skip`: skip current song
- `/stop`: stop playback and clear queue
- `/pause`: pause playback
- `/resume`: resume playback
- `/volume [level]`: set or show volume
- `/queue [page]`: show queue
- `/nowplaying`: show current track and progress

### Utility

- `/help`: list commands
- `/ping`: latency check
- `/update`: changelog/update info

## Project Structure

```text
src/
  index.ts
  config/
    environment.ts
  core/
    client.ts
    logger.ts
  commands/
    index.ts
    music/
    utility/
  events/
    index.ts
    interactionCreate.ts
    handleButtons.ts
    ready.ts
    voiceStateUpdate.ts
    guildCreate.ts
    guildDelete.ts
  services/
    musicPlayer.ts
    queueManager.ts
    youtubeService.ts
  models/
    command.ts
    guildQueue.ts
    song.ts
  utils/
    components.ts
    constants.ts
    embed.ts
    formatDuration.ts
    guards.ts
    validation.ts
  types/
    index.ts
  scripts/
    deploy-commands.ts
```

## Development Commands

```bash
npm run dev            # hot reload
npm run build          # compile TypeScript
npm start              # run dist build
npm run deploy-commands
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run format
```

## Troubleshooting

### Bot joins voice but no audio

Check container logs first:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Common causes:

- Expired or invalid YouTube cookie
- YouTube rate limits or region restrictions
- Missing Discord voice permissions in target channel

### Build fails on yt-dlp installation

This repository installs `yt-dlp` from Debian packages in Docker image.
If your base image changes, ensure `yt-dlp` is still installed and available in PATH.

### Commands do not appear in Discord

Run command deployment again:

```bash
docker compose -f docker-compose.prod.yml run --rm musicbox npm run deploy-commands
```

## Security Notes

- Never commit `.env` or cookie files
- Rotate Discord token immediately if leaked
- Keep cookie refresh process private and host-side

## License

ISC
