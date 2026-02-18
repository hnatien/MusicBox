import { AudioPlayer, createAudioPlayer, NoSubscriberBehavior } from '@discordjs/voice';
import type { GuildQueue } from '../models/guildQueue.js';
import type { Song } from '../models/song.js';
import { config } from '../config/environment.js';
import { logger } from '../core/logger.js';

const queues = new Map<string, GuildQueue>();

export function getQueue(guildId: string): GuildQueue | undefined {
    return queues.get(guildId);
}

export function hasQueue(guildId: string): boolean {
    return queues.has(guildId);
}

export function createQueue(
    guildId: string,
    options: Pick<GuildQueue, 'textChannelId' | 'voiceChannelId' | 'connection'>,
): GuildQueue {
    const player: AudioPlayer = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });

    const queue: GuildQueue = {
        ...options,
        player,
        songs: [],
        currentSong: null,
        volume: config.DEFAULT_VOLUME / 100, // Normalize to 0-1 range
        isPlaying: false,
        isPaused: false,
        playStartTime: null,
        inactivityTimer: null,
    };

    options.connection.subscribe(player);

    queues.set(guildId, queue);
    logger.info(`Queue created for guild ${guildId}`);

    return queue;
}

export function deleteQueue(guildId: string): void {
    const queue = queues.get(guildId);

    if (!queue) return;

    if (queue.inactivityTimer) {
        clearTimeout(queue.inactivityTimer);
    }

    if (queue.progressInterval) {
        clearInterval(queue.progressInterval);
    }

    queue.player.stop(true);

    try {
        queue.connection.destroy();
    } catch {
    }

    queues.delete(guildId);
    logger.info(`Queue deleted for guild ${guildId}`);
}

export function addSong(guildId: string, song: Song): number {
    const queue = queues.get(guildId);
    if (!queue) throw new Error(`No queue exists for guild ${guildId}`);

    if (queue.songs.length >= config.MAX_QUEUE_SIZE) {
        throw new Error(`Queue is full (max ${config.MAX_QUEUE_SIZE} songs)`);
    }

    queue.songs.push(song);

    if (!queue.currentSong && queue.songs.length === 1) return 0;

    return queue.songs.length;
}

export function getNextSong(guildId: string): Song | undefined {
    const queue = queues.get(guildId);
    if (!queue) return undefined;

    return queue.songs.shift();
}

export function clearQueue(guildId: string): void {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.progressInterval) {
        clearInterval(queue.progressInterval);
        queue.progressInterval = undefined;
    }

    queue.songs = [];
    queue.currentSong = null;
    queue.isPlaying = false;
    queue.isPaused = false;
    queue.playStartTime = null;
    queue.nowPlayingMessage = undefined;
}

export function getQueueSize(guildId: string): number {
    const queue = queues.get(guildId);
    return queue?.songs.length ?? 0;
}
