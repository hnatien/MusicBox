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

export async function play(
    guildId: string,
    client: MusicClient,
    existingMessage?: Message,
    _skipCount = 0,
): Promise<void> {
    const queue = queueManager.getQueue(guildId);
    if (!queue) return;

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

    const queueSong = queueManager.getNextSong(guildId);
    let song = queueSong ?? queueManager.getNextMixSong(guildId);

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

        const resource = createAudioResource(stream, {
            inputType: StreamType.Raw,
            inlineVolume: true,
        });

        resource.volume?.setVolume(queue.volume);

        queue.currentSong = song;
        queue.isPlaying = true;
        queue.isPaused = false;
        queue.playStartTime = Date.now();

        queue.player.play(resource);

        const onIdle = () => {
            queue.player.removeListener(AudioPlayerStatus.Idle, onIdle);
            stopProgressUpdate(guildId);
            play(guildId, client, undefined, 0).catch((error) => {
                logger.error(`Auto-play next song failed for guild ${guildId}`, { error });
            });
        };

        queue.player.on(AudioPlayerStatus.Idle, onIdle);

        const onError = (error: unknown) => {
            queue.player.removeListener('error', onError);
            stopProgressUpdate(guildId);

            const message = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            logger.error(`Audio player error for guild ${guildId}: ${message}`, { stack });

            sendToTextChannel(client, queue.textChannelId, song.title);

            play(guildId, client, undefined, _skipCount + 1).catch((err) => {
                const skipErrorMsg = err instanceof Error ? err.message : String(err);
                logger.error(`Skip after error failed for guild ${guildId}: ${skipErrorMsg}`);
            });
        };

        queue.player.on('error', onError);

        if (existingMessage) {
            queue.nowPlayingMessage = existingMessage;
            startProgressUpdate(guildId);
        } else {
            const textChannel = client.channels.cache.get(queue.textChannelId) as TextBasedChannel | undefined;
            if (textChannel && 'send' in textChannel) {
                const embed = createNowPlayingEmbed(song, 0);
                const message = await textChannel.send({ embeds: [embed] }).catch(() => { });
                if (message) {
                    queue.nowPlayingMessage = message;
                    startProgressUpdate(guildId);
                }
            }
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to play song "${song.title}" in guild ${guildId}: ${errorMsg}`);

        sendToTextChannel(client, queue.textChannelId, song.title);
        await play(guildId, client, undefined, _skipCount + 1);
    }
}

export function skip(guildId: string): boolean {
    const queue = queueManager.getQueue(guildId);
    if (!queue) return false;

    stopProgressUpdate(guildId);
    queue.player.stop();
    return true;
}

export function stop(guildId: string): void {
    const queue = queueManager.getQueue(guildId);
    if (!queue) return;

    stopProgressUpdate(guildId);
    queueManager.deleteQueue(guildId);
}

export function pause(guildId: string): boolean {
    const queue = queueManager.getQueue(guildId);
    if (!queue || !queue.isPlaying || queue.isPaused) return false;

    queue.player.pause();
    queue.isPaused = true;
    stopProgressUpdate(guildId);
    return true;
}

export function resume(guildId: string): boolean {
    const queue = queueManager.getQueue(guildId);
    if (!queue || !queue.isPaused) return false;

    queue.player.unpause();
    queue.isPaused = false;
    startProgressUpdate(guildId);
    return true;
}

function startProgressUpdate(guildId: string): void {
    const queue = queueManager.getQueue(guildId);
    if (!queue || !queue.nowPlayingMessage || !queue.currentSong) return;

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
            const state = queue.player.state as AudioPlayerPlayingState;
            elapsedSeconds = Math.floor(state.resource.playbackDuration / 1000);
        } else {
            elapsedSeconds = Math.floor((Date.now() - (queue.playStartTime || Date.now())) / 1000);
        }

        if (elapsedSeconds >= queue.currentSong.duration) {
            stopProgressUpdate(guildId);
            return;
        }

        const embed = createNowPlayingEmbed(queue.currentSong, elapsedSeconds);
        await queue.nowPlayingMessage.edit({ embeds: [embed] }).catch(() => {
            stopProgressUpdate(guildId);
        });
    }, 15_000);
}

function stopProgressUpdate(guildId: string): void {
    const queue = queueManager.getQueue(guildId);
    if (queue?.progressInterval) {
        clearInterval(queue.progressInterval);
        queue.progressInterval = undefined;
    }
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
