import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/environment.js', () => ({
    config: {
        DEFAULT_VOLUME: 50,
        MAX_QUEUE_SIZE: 100,
        INACTIVITY_TIMEOUT: 300,
    },
}));

vi.mock('../../src/core/logger.js', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('@discordjs/voice', () => ({
    createAudioPlayer: vi.fn(() => ({
        on: vi.fn(),
        stop: vi.fn(),
        play: vi.fn(),
        state: { status: 'idle' },
    })),
    NoSubscriberBehavior: { Play: 'play' },
}));

import { requireVoiceChannel, requireBotPermissions, requireQueue, requirePlaying } from '../../src/utils/guards.js';
import * as queueManager from '../../src/services/queueManager.js';
import type { ChatInputCommandInteraction, VoiceBasedChannel, VoiceConnection } from 'discord.js';
import type { Song } from '../../src/models/song.js';

function createMockInteraction(overrides: Record<string, unknown> = {}): ChatInputCommandInteraction {
    return {
        member: {
            voice: {
                channel: overrides.voiceChannel ?? null,
            },
        },
        client: {
            user: { id: 'bot-123' },
        },
        guildId: overrides.guildId ?? 'guild-123',
        reply: vi.fn(),
        ...overrides,
    } as unknown as ChatInputCommandInteraction;
}

function createMockVoiceChannel(overrides: Record<string, unknown> = {}): VoiceBasedChannel {
    return {
        id: 'voice-1',
        guild: { id: 'guild-123', voiceAdapterCreator: {} },
        permissionsFor: vi.fn().mockReturnValue({
            has: vi.fn().mockReturnValue(overrides.hasPermissions ?? true),
        }),
        ...overrides,
    } as unknown as VoiceBasedChannel;
}

const GUILD_ID = 'guild-123';

describe('requireVoiceChannel', () => {
    it('returns voice channel when user is in one', async () => {
        const voiceChannel = createMockVoiceChannel();
        const interaction = createMockInteraction({ voiceChannel });

        const result = await requireVoiceChannel(interaction);

        expect(result).toBe(voiceChannel);
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    it('replies with error and returns null when not in voice channel', async () => {
        const interaction = createMockInteraction({ voiceChannel: null });

        const result = await requireVoiceChannel(interaction);

        expect(result).toBeNull();
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({ ephemeral: true }),
        );
    });
});

describe('requireBotPermissions', () => {
    it('returns true when bot has permissions', async () => {
        const voiceChannel = createMockVoiceChannel({ hasPermissions: true });
        const interaction = createMockInteraction();

        const result = await requireBotPermissions(interaction, voiceChannel);

        expect(result).toBe(true);
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    it('replies with error and returns false when missing permissions', async () => {
        const voiceChannel = createMockVoiceChannel({ hasPermissions: false });
        const interaction = createMockInteraction();

        const result = await requireBotPermissions(interaction, voiceChannel);

        expect(result).toBe(false);
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({ ephemeral: true }),
        );
    });
});

describe('requireQueue', () => {
    beforeEach(() => {
        if (queueManager.hasQueue(GUILD_ID)) {
            queueManager.deleteQueue(GUILD_ID);
        }
    });

    it('returns queue when it exists', async () => {
        const mockConnection = { subscribe: vi.fn(), destroy: vi.fn() } as unknown as VoiceConnection;
        const queue = queueManager.createQueue(GUILD_ID, {
            textChannelId: 'text-1',
            voiceChannelId: 'voice-1',
            connection: mockConnection,
        });

        const interaction = createMockInteraction({ guildId: GUILD_ID });
        const result = await requireQueue(interaction);

        expect(result).toBe(queue);
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    it('replies with error and returns null when no queue', async () => {
        const interaction = createMockInteraction({ guildId: GUILD_ID });
        const result = await requireQueue(interaction);

        expect(result).toBeNull();
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({ ephemeral: true }),
        );
    });
});

describe('requirePlaying', () => {
    beforeEach(() => {
        if (queueManager.hasQueue(GUILD_ID)) {
            queueManager.deleteQueue(GUILD_ID);
        }
    });

    it('returns queue when currently playing', async () => {
        const mockConnection = { subscribe: vi.fn(), destroy: vi.fn() } as unknown as VoiceConnection;
        const queue = queueManager.createQueue(GUILD_ID, {
            textChannelId: 'text-1',
            voiceChannelId: 'voice-1',
            connection: mockConnection,
        });
        queue.currentSong = {
            title: 'Test', url: 'https://youtube.com/watch?v=test',
            duration: 100, durationFormatted: '1:40',
            thumbnail: '', channelName: 'Ch', requestedBy: 'u1',
        } as Song;

        const interaction = createMockInteraction({ guildId: GUILD_ID });
        const result = await requirePlaying(interaction);

        expect(result).toBe(queue);
    });

    it('returns null when no current song', async () => {
        const mockConnection = { subscribe: vi.fn(), destroy: vi.fn() } as unknown as VoiceConnection;
        queueManager.createQueue(GUILD_ID, {
            textChannelId: 'text-1',
            voiceChannelId: 'voice-1',
            connection: mockConnection,
        });

        const interaction = createMockInteraction({ guildId: GUILD_ID });
        const result = await requirePlaying(interaction);

        expect(result).toBeNull();
        expect(interaction.reply).toHaveBeenCalled();
    });

    it('returns null when no queue at all', async () => {
        const interaction = createMockInteraction({ guildId: GUILD_ID });
        const result = await requirePlaying(interaction);

        expect(result).toBeNull();
        expect(interaction.reply).toHaveBeenCalled();
    });
});
