import {
    AudioPlayerStatus,
    StreamType,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus,
    type VoiceConnection,
    type AudioResource,
    type AudioPlayerPlayingState,
} from '@discordjs/voice';
import type { VoiceBasedChannel, TextBasedChannel, Message } from 'discord.js';
import * as queueManager from './queueManager.js';
import { getAudioStream } from './youtubeService.js';
import { logger } from '../core/logger.js';
import { config } from '../config/environment.js';
import { createNowPlayingEmbed, createErrorEmbed } from '../utils/embed.js';
import { MAX_RECONNECT_ATTEMPTS } from '../utils/constants.js';
import type { MusicClient } from '../core/client.js';
import type { Song } from '../models/song.js';
import { database } from './database.js';

const playLocks = new Map<string, Promise<void>>();

export function joinChannel(channel: VoiceBasedChannel): VoiceConnection {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch {
            logger.warn(`Voice connection lost for guild ${channel.guild.id}, cleaning up`);
            queueManager.deleteQueue(channel.guild.id);
        }
    });

    return connection;
}

export function play(
    guildId: string,
    client: MusicClient,
    existingMessage?: Message,
    _skipCount = 0,
): Promise<void> {
    const prev = playLocks.get(guildId) ?? Promise.resolve();
    const next = prev.then(function (): Promise<void> {
        return _play(guildId, client, existingMessage, _skipCount);
    });
    const stored = next.catch(function (): void {});
    stored.finally(function (): void {
        if (playLocks.get(guildId) === stored) {
            playLocks.delete(guildId);
        }
    });
    playLocks.set(guildId, stored);
    return next;
}

async function _play(
    guildId: string,
    client: MusicClient,
    existingMessage?: Message,
    _skipCount = 0,
): Promise<void> {
    const queue = queueManager.getQueue(guildId);
    if (!queue) {
        return;
    }

    if (_skipCount > 10) {
        logger.warn(`Too many consecutive failures for guild ${guildId}, stopping`);
        stop(guildId);
        return;
    }

    if (queue.inactivityTimer) {
        clearTimeout(queue.inactivityTimer);
        queue.inactivityTimer = null;
    }

    stopProgressUpdate(guildId);

    queue.player.removeAllListeners(AudioPlayerStatus.Idle);
    queue.player.removeAllListeners('error');

    let song: Song | undefined;
    let reusedMessage = false;

    if (queue.currentSong) {
        if (queue.repeatMode === 'one') {
            song = queue.currentSong;
            queue.repeatCount++;
            reusedMessage = true;
        } else if (queue.repeatMode === 'all') {
            queue.songs.push(queue.currentSong);
            song = queueManager.getNextSong(guildId);
            // If the same song is back (e.g. only 1 song in queue), increment
            if (song === queue.currentSong) {
                queue.repeatCount++;
            } else if (song) {
                queue.repeatCount = 0; // New song in "all" or reset? Usually "repeat all" doesn't count per song
            }

            reusedMessage = true;
        } else {
            song = queueManager.getNextSong(guildId);
            queue.repeatCount = 0;
        }
    } else {
        song = queueManager.getNextSong(guildId);
        queue.repeatCount = 0;
    }

    if (!song) {
        song = queueManager.getNextMixSong(guildId);
    }

    if (!song) {
        queue.currentSong = null;
        queue.isPlaying = false;
        queue.playStartTime = null;
        queue.nowPlayingMessage = undefined;

        startInactivityTimer(guildId);
        return;
    }

    try {
        const { stream } = await getAudioStream(song.url);

        queue.activeStream?.destroy();
        queue.activeStream = stream;

        const resource = createAudioResource(stream, {
            inputType: StreamType.Raw,
            inlineVolume: true,
        });

        resource.volume?.setVolume(queue.volume);

        queue.currentSong = song;

        const cleanUp = function (): void {
            if (queue) {
                queue.player.removeListener(AudioPlayerStatus.Idle, onIdle);
                queue.player.removeListener('error', onError);
            }
        };

        const onIdle = function (): void {
            cleanUp();
            stopProgressUpdate(guildId);
            play(guildId, client, undefined, 0).catch(function (error): void {
                logger.error(`Auto-play next song failed for guild ${guildId}`, { error });
            });
        };

        const onError = function (error: unknown): void {
            cleanUp();
            stopProgressUpdate(guildId);

            const message = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            logger.error(`Audio player error for guild ${guildId}: ${message}`, { stack });

            play(guildId, client, undefined, _skipCount + 1).catch(function (err): void {
                const skipErrorMsg = err instanceof Error ? err.message : String(err);
                logger.error(`Skip after error failed for guild ${guildId}: ${skipErrorMsg}`);
            });
        };

        queue.player.on(AudioPlayerStatus.Idle, onIdle);
        queue.player.on('error', onError);

        queue.isPlaying = true;
        queue.isPaused = false;
        queue.playStartTime = Date.now();
        queue.player.play(resource);
        database.incrementSongsPlayed();

        const result = createNowPlayingEmbed(song, 0, false, queue.repeatMode, queue.repeatCount);
        if (existingMessage || (reusedMessage && queue.nowPlayingMessage)) {
            const messageToUse = existingMessage || queue.nowPlayingMessage!;
            await messageToUse.edit({ embeds: result.embeds, components: result.components }).catch(function (): void { });
            queue.nowPlayingMessage = messageToUse;
            startProgressUpdate(guildId);
        } else {
            const textChannel = client.channels.cache.get(queue.textChannelId) as TextBasedChannel | undefined;
            if (textChannel && 'send' in textChannel) {
                const message = await textChannel.send({ embeds: result.embeds, components: result.components }).catch(function (): void { });
                if (message) {
                    queue.nowPlayingMessage = message;
                    startProgressUpdate(guildId);
                }
            }
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to play song "${song?.title}" in guild ${guildId}: ${errorMsg}`);

        sendToTextChannel(client, queue.textChannelId, song?.title ?? 'Unknown Song');
        await play(guildId, client, undefined, _skipCount + 1);
    }
}

export function skip(guildId: string): boolean {
    const queue = queueManager.getQueue(guildId);
    if (!queue) {
        return false;
    }

    stopProgressUpdate(guildId);
    queue.player.stop();
    return true;
}

export function stop(guildId: string): void {
    const queue = queueManager.getQueue(guildId);
    if (!queue) {
        return;
    }

    stopProgressUpdate(guildId);
    queueManager.deleteQueue(guildId);
}

export function pause(guildId: string): boolean {
    const queue = queueManager.getQueue(guildId);
    if (!queue || !queue.isPlaying || queue.isPaused) {
        return false;
    }

    queue.player.pause();
    queue.isPaused = true;
    stopProgressUpdate(guildId);

    // Update UI immediately
    if (queue.nowPlayingMessage && queue.currentSong) {
        let elapsedSeconds = 0;
        if (queue.player.state.status === AudioPlayerStatus.Paused) {
            const state = queue.player.state as any; // Cast to any to access resource safely across status types
            elapsedSeconds = Math.floor(state.resource.playbackDuration / 1000);
        }
        const result = createNowPlayingEmbed(queue.currentSong, elapsedSeconds, true, queue.repeatMode, queue.repeatCount);
        queue.nowPlayingMessage.edit({ embeds: result.embeds, components: result.components }).catch(function (): void { });
    }

    return true;
}

export function resume(guildId: string): boolean {
    const queue = queueManager.getQueue(guildId);
    if (!queue || !queue.isPaused) {
        return false;
    }

    queue.player.unpause();
    queue.isPaused = false;
    startProgressUpdate(guildId);

    // Update UI immediately
    if (queue.nowPlayingMessage && queue.currentSong) {
        let elapsedSeconds = 0;
        if (queue.player.state.status === AudioPlayerStatus.Playing) {
            const state = queue.player.state as AudioPlayerPlayingState;
            elapsedSeconds = Math.floor(state.resource.playbackDuration / 1000);
        }
        const result = createNowPlayingEmbed(queue.currentSong, elapsedSeconds, false, queue.repeatMode, queue.repeatCount);
        queue.nowPlayingMessage.edit({ embeds: result.embeds, components: result.components }).catch(function (): void { });
    }

    return true;
}

export function stopProgressUpdate(guildId: string): void {
    const queue = queueManager.getQueue(guildId);
    if (queue?.progressInterval) {
        clearInterval(queue.progressInterval);
        queue.progressInterval = undefined;
    }
}

export function startProgressUpdate(guildId: string): void {
    const queue = queueManager.getQueue(guildId);
    if (!queue || !queue.nowPlayingMessage || !queue.currentSong) {
        return;
    }

    if (queue.progressInterval) {
        clearInterval(queue.progressInterval);
    }

    queue.progressInterval = setInterval(async () => {
        if (!queue.isPlaying || queue.isPaused || !queue.currentSong || !queue.nowPlayingMessage) {
            stopProgressUpdate(guildId);
            return;
        }

        let elapsedSeconds = 0;

        if (queue.player.state.status === AudioPlayerStatus.Playing) {
            const state = queue.player.state;
            elapsedSeconds = Math.floor(state.resource.playbackDuration / 1000);
        } else {
            elapsedSeconds = Math.floor((Date.now() - (queue.playStartTime || Date.now())) / 1000);
        }

        if (elapsedSeconds >= queue.currentSong.duration) {
            elapsedSeconds = queue.currentSong.duration;
            stopProgressUpdate(guildId);
        }

        const result = createNowPlayingEmbed(queue.currentSong, elapsedSeconds, queue.isPaused, queue.repeatMode, queue.repeatCount);
        
        try {
            await queue.nowPlayingMessage.edit({ 
                embeds: result.embeds, 
                components: result.components 
            });
        } catch (error) {
            // If message is deleted or lacks permission, stop updating to save resources
            logger.warn(`Could not update progress for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`);
            stopProgressUpdate(guildId);
        }
    }, 15_000);
}

export function setVolume(guildId: string, volume: number): boolean {
    const queue = queueManager.getQueue(guildId);
    if (!queue) return false;

    const normalizedVolume = Math.max(0, Math.min(volume, 100)) / 100;
    queue.volume = normalizedVolume;

    const resource = queue.player.state.status === AudioPlayerStatus.Playing
        ? (queue.player.state.resource as ReturnType<typeof createAudioResource>)
        : null;

    if (resource?.volume) {
        resource.volume.setVolume(normalizedVolume);
    }

    return true;
}

export function disconnect(guildId: string): void {
    queueManager.deleteQueue(guildId);
}

export function startInactivityTimer(guildId: string, customTimeout?: number): void {
    const queue = queueManager.getQueue(guildId);
    if (!queue) return;

    if (queue.inactivityTimer) {
        clearTimeout(queue.inactivityTimer);
    }

    const timeout = customTimeout ?? config.INACTIVITY_TIMEOUT;

    queue.inactivityTimer = setTimeout(() => {
        logger.info(`Inactivity timeout reached for guild ${guildId}, disconnecting`);
        queueManager.deleteQueue(guildId);
    }, timeout * 1000);
}

async function sendToTextChannel(
    client: MusicClient,
    channelId: string,
    songTitle: string,
): Promise<void> {
    try {
        const channel = client.channels.cache.get(channelId) as TextBasedChannel | undefined;
        if (channel && 'send' in channel) {
            const embed = createErrorEmbed(`Failed to play **${songTitle}**. Skipping...`);
            await channel.send({ embeds: [embed] });
        }
    } catch {
    }
}
