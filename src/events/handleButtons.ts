import { GuildMember, type ButtonInteraction } from 'discord.js';
import type { MusicClient } from '../core/client.js';
import * as queueManager from '../services/queueManager.js';
import * as musicPlayer from '../services/musicPlayer.js';
import {
    createNowPlayingEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createQueueEmbed,
} from '../utils/embed.js';
import { createNowPlayingButtons, createQueueButtons } from '../utils/components.js';
import { EMOJIS, QUEUE_PAGE_SIZE } from '../utils/constants.js';

export async function handleButtonInteraction(
    client: MusicClient,
    interaction: ButtonInteraction,
): Promise<void> {
    if (!interaction.guildId) return;

    const parts = interaction.customId.split(':');
    const prefix = parts[0];

    try {
        if (prefix === 'np') {
            await handleNowPlayingButton(client, interaction, parts);
        } else if (prefix === 'queue') {
            await handleQueueButton(interaction, parts);
        }
    } catch {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                embeds: [createErrorEmbed('Something went wrong.')],
                ephemeral: true,
            }).catch(() => { });
        }
    }
}

async function handleNowPlayingButton(
    _client: MusicClient,
    interaction: ButtonInteraction,
    parts: string[],
): Promise<void> {
    const action = parts[1];
    const guildId = parts[2];

    const member = interaction.member as GuildMember;
    if (!member.voice.channel) {
        await interaction.reply({
            embeds: [createErrorEmbed('You must be in a voice channel to use this.')],
            ephemeral: true,
        });
        return;
    }

    const queue = queueManager.getQueue(guildId);
    if (!queue || !queue.currentSong) {
        await interaction.update({ components: [] }).catch(() => { });
        return;
    }

    switch (action) {
        case 'pause': {
            if (queue.isPaused) {
                await interaction.reply({
                    embeds: [createErrorEmbed('Playback is already paused.')],
                    ephemeral: true,
                });
                return;
            }
            musicPlayer.pause(guildId);
            const pauseElapsed = musicPlayer.getElapsedSeconds(guildId);
            await interaction.update({
                embeds: [createNowPlayingEmbed(queue.currentSong, pauseElapsed, true)],
                components: [createNowPlayingButtons(guildId, true)],
            });
            break;
        }
        case 'resume': {
            if (!queue.isPaused) {
                await interaction.reply({
                    embeds: [createErrorEmbed('Playback is not paused.')],
                    ephemeral: true,
                });
                return;
            }
            musicPlayer.resume(guildId);
            const resumeElapsed = musicPlayer.getElapsedSeconds(guildId);
            await interaction.update({
                embeds: [createNowPlayingEmbed(queue.currentSong, resumeElapsed, false)],
                components: [createNowPlayingButtons(guildId, false)],
            });
            break;
        }
        case 'skip': {
            const skippedTitle = queue.currentSong.title;
            musicPlayer.skip(guildId);
            await interaction.update({
                embeds: [createSuccessEmbed(`${EMOJIS.SKIP} Skipped **${skippedTitle}**`)],
                components: [],
            });
            break;
        }
        case 'stop': {
            musicPlayer.stop(guildId);
            await interaction.update({
                embeds: [createSuccessEmbed(`${EMOJIS.STOP} Playback stopped and queue cleared.`)],
                components: [],
            });
            break;
        }
    }
}

async function handleQueueButton(
    interaction: ButtonInteraction,
    parts: string[],
): Promise<void> {
    const guildId = parts[2];
    const targetPage = parseInt(parts[3], 10);

    const queue = queueManager.getQueue(guildId);
    if (!queue || (!queue.currentSong && queue.songs.length === 0)) {
        await interaction.update({
            embeds: [createErrorEmbed('The queue is empty.')],
            components: [],
        });
        return;
    }

    const totalPages = Math.max(1, Math.ceil(queue.songs.length / QUEUE_PAGE_SIZE));
    const page = Math.min(Math.max(1, targetPage), totalPages);

    const startIndex = (page - 1) * QUEUE_PAGE_SIZE;
    const pageSongs = queue.songs.slice(startIndex, startIndex + QUEUE_PAGE_SIZE);

    const totalDuration =
        queue.songs.reduce((sum, s) => sum + s.duration, 0) +
        (queue.currentSong?.duration ?? 0);

    const embed = createQueueEmbed(
        pageSongs, queue.currentSong, page, totalPages, queue.songs.length, totalDuration,
    );
    const components = totalPages > 1 ? [createQueueButtons(guildId, page, totalPages)] : [];

    await interaction.update({ embeds: [embed], components });
}
