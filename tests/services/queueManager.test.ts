import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/config/environment.js', () => ({
    config: {
        DEFAULT_VOLUME: 50,
        MAX_QUEUE_SIZE: 5,
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
        pause: vi.fn(),
        unpause: vi.fn(),
        state: { status: 'idle' },
        removeAllListeners: vi.fn(),
        removeListener: vi.fn(),
    })),
    NoSubscriberBehavior: { Play: 'play' },
}));

import * as queueManager from '../../src/services/queueManager.js';
import type { Song } from '../../src/models/song.js';
import type { VoiceConnection } from '@discordjs/voice';

const mockSong = (title = 'Test Song'): Song => ({
    title,
    url: `https://www.youtube.com/watch?v=${title.replace(/\s/g, '')}`,
    duration: 240,
    durationFormatted: '4:00',
    thumbnail: '',
    channelName: 'Test Channel',
    requestedBy: 'user123',
});

const mockConnection = {
    subscribe: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
} as unknown as VoiceConnection;

const GUILD_ID = 'guild-123';

describe('queueManager', () => {
    beforeEach(() => {
        // Clean up any existing queue
        if (queueManager.hasQueue(GUILD_ID)) {
            queueManager.deleteQueue(GUILD_ID);
        }
    });

    describe('createQueue / getQueue / hasQueue', () => {
        it('creates and retrieves a queue', () => {
            expect(queueManager.hasQueue(GUILD_ID)).toBe(false);
            expect(queueManager.getQueue(GUILD_ID)).toBeUndefined();

            const queue = queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            expect(queueManager.hasQueue(GUILD_ID)).toBe(true);
            expect(queueManager.getQueue(GUILD_ID)).toBe(queue);
            expect(queue.songs).toEqual([]);
            expect(queue.currentSong).toBeNull();
            expect(queue.volume).toBe(0.5);
            expect(queue.isPlaying).toBe(false);
            expect(queue.isPaused).toBe(false);
        });

        it('subscribes connection to player', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            expect(mockConnection.subscribe).toHaveBeenCalled();
        });
    });

    describe('deleteQueue', () => {
        it('removes the queue and destroys connection', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            queueManager.deleteQueue(GUILD_ID);

            expect(queueManager.hasQueue(GUILD_ID)).toBe(false);
            expect(queueManager.getQueue(GUILD_ID)).toBeUndefined();
        });

        it('is safe to call on non-existent queue', () => {
            expect(() => queueManager.deleteQueue('nonexistent')).not.toThrow();
        });

        it('clears timers on delete', () => {
            const queue = queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            queue.inactivityTimer = setTimeout(() => {}, 99999);
            queue.progressInterval = setInterval(() => {}, 99999);

            queueManager.deleteQueue(GUILD_ID);
            // No assertion needed — just ensuring no timer leaks
        });
    });

    describe('addSong', () => {
        it('adds a song and returns position', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            const pos = queueManager.addSong(GUILD_ID, mockSong());
            // First song with no currentSong returns 0 (will play immediately)
            expect(pos).toBe(0);
        });

        it('returns queue length as position for subsequent songs', () => {
            const queue = queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            queue.currentSong = mockSong('Playing');

            const pos1 = queueManager.addSong(GUILD_ID, mockSong('Song 1'));
            expect(pos1).toBe(1);

            const pos2 = queueManager.addSong(GUILD_ID, mockSong('Song 2'));
            expect(pos2).toBe(2);
        });

        it('throws when queue is full', () => {
            const queue = queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            queue.currentSong = mockSong('Playing');

            // MAX_QUEUE_SIZE is 5
            for (let i = 0; i < 5; i++) {
                queueManager.addSong(GUILD_ID, mockSong(`Song ${i}`));
            }

            expect(() => queueManager.addSong(GUILD_ID, mockSong('Overflow'))).toThrow('Queue is full');
        });

        it('throws when no queue exists', () => {
            expect(() => queueManager.addSong('nonexistent', mockSong())).toThrow('No queue exists');
        });
    });

    describe('getNextSong', () => {
        it('returns and removes the first song (FIFO)', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            queueManager.addSong(GUILD_ID, mockSong('First'));
            const queue = queueManager.getQueue(GUILD_ID)!;
            queue.currentSong = mockSong('Playing');
            queueManager.addSong(GUILD_ID, mockSong('Second'));

            const next = queueManager.getNextSong(GUILD_ID);
            expect(next?.title).toBe('First');

            const next2 = queueManager.getNextSong(GUILD_ID);
            expect(next2?.title).toBe('Second');
        });

        it('returns undefined when queue is empty', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            expect(queueManager.getNextSong(GUILD_ID)).toBeUndefined();
        });

        it('returns undefined when no queue exists', () => {
            expect(queueManager.getNextSong('nonexistent')).toBeUndefined();
        });
    });

    describe('clearQueue', () => {
        it('resets all queue state', () => {
            const queue = queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            queue.currentSong = mockSong();
            queue.isPlaying = true;
            queue.isPaused = true;
            queue.playStartTime = Date.now();
            queueManager.addSong(GUILD_ID, mockSong('Queued'));

            queueManager.clearQueue(GUILD_ID);

            expect(queue.songs).toEqual([]);
            expect(queue.currentSong).toBeNull();
            expect(queue.isPlaying).toBe(false);
            expect(queue.isPaused).toBe(false);
            expect(queue.playStartTime).toBeNull();
            expect(queue.mixContext).toBeUndefined();
        });

        it('is safe to call on non-existent queue', () => {
            expect(() => queueManager.clearQueue('nonexistent')).not.toThrow();
        });
    });

    describe('getQueueSize', () => {
        it('returns number of songs in queue', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            expect(queueManager.getQueueSize(GUILD_ID)).toBe(0);

            queueManager.addSong(GUILD_ID, mockSong());
            expect(queueManager.getQueueSize(GUILD_ID)).toBe(1);
        });

        it('returns 0 for non-existent queue', () => {
            expect(queueManager.getQueueSize('nonexistent')).toBe(0);
        });
    });

    describe('mix context', () => {
        it('sets and retrieves mix songs sequentially', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            const mixSongs = [mockSong('Mix 1'), mockSong('Mix 2'), mockSong('Mix 3')];
            queueManager.setMixContext(GUILD_ID, mixSongs, 'Test Mix');

            expect(queueManager.getNextMixSong(GUILD_ID)?.title).toBe('Mix 1');
            expect(queueManager.getNextMixSong(GUILD_ID)?.title).toBe('Mix 2');
            expect(queueManager.getNextMixSong(GUILD_ID)?.title).toBe('Mix 3');
            expect(queueManager.getNextMixSong(GUILD_ID)).toBeUndefined();
        });

        it('returns undefined when no mix context', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            expect(queueManager.getNextMixSong(GUILD_ID)).toBeUndefined();
        });

        it('clears mix context', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            queueManager.setMixContext(GUILD_ID, [mockSong()], 'Mix');
            queueManager.clearMixContext(GUILD_ID);

            expect(queueManager.getNextMixSong(GUILD_ID)).toBeUndefined();
        });

        it('clears mix context when all songs exhausted', () => {
            queueManager.createQueue(GUILD_ID, {
                textChannelId: 'text-1',
                voiceChannelId: 'voice-1',
                connection: mockConnection,
            });

            queueManager.setMixContext(GUILD_ID, [mockSong()], 'Mix');
            queueManager.getNextMixSong(GUILD_ID); // consume the only song
            expect(queueManager.getNextMixSong(GUILD_ID)).toBeUndefined();

            // mixContext should be cleared
            const queue = queueManager.getQueue(GUILD_ID)!;
            expect(queue.mixContext).toBeUndefined();
        });
    });
});
