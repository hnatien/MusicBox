# Memory — Music Box

## Project Overview
- **Name**: Music Box
- **Type**: Discord Music Bot
- **Stack**: TypeScript, discord.js v14, ES Modules, Node.js ≥ 20
- **License**: ISC

## Project Structure
```
src/
├── index.ts                  # Entry point
├── config/environment.ts     # Env validation
├── core/                     # client.ts, logger.ts
├── commands/
│   ├── music/                # play, search, skip, stop, pause, resume, volume, queue, nowplaying
│   └── utility/              # ping, help, update
├── events/                   # interactionCreate, handleButtons, voiceStateUpdate, ready, guildCreate, guildDelete
├── services/                 # musicPlayer, queueManager, youtubeService
├── models/                   # command, guildQueue, song
├── utils/                    # guards, components, embed, constants, formatDuration, validation
├── types/index.ts            # Discord.js type augmentation
└── scripts/deploy-commands.ts
tests/
├── services/queueManager.test.ts
└── utils/                    # constants, embed, formatDuration, guards, validation tests
```

## Current State
- v1.2.0 — Fully functional bot with play, search, queue, volume, interactive buttons
- 38 source files, 6 test files
- ESLint v10 flat config issue (npm run lint fails — old .eslintrc format)

## Changelog

## [2026-03-18] README.md complete rewrite
- **Type**: chore
- **Files**: README.md, memory.md
- **Summary**: Rewrote README.md following best practices — centered header with shields.io badges, table of contents, feature table with emojis, demo section, step-by-step setup guide with tips, config table, command tables with cooldowns, full architecture tree with play flow and button flow diagrams, tech stack table, contributing guide, and footer. Created memory.md.
