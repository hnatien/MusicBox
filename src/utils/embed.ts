import { EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS, PROGRESS_BAR_LENGTH, QUEUE_PAGE_SIZE } from './constants.js';
import { createProgressBar, formatDuration } from './formatDuration.js';
import type { Song } from '../models/song.js';

export function createNowPlayingEmbed(song: Song, elapsedSeconds: number): EmbedBuilder {
    const progressBar = createProgressBar(elapsedSeconds, song.duration, PROGRESS_BAR_LENGTH);
    const elapsed = formatDuration(elapsedSeconds);

    return new EmbedBuilder()
        .setColor(COLORS.NOW_PLAYING)
        .setTitle(`${EMOJIS.MUSIC} Now Playing`)
        .setDescription(
            `**[${song.title}](${song.url})**\n` +
            `${song.channelName}\n\n` +
            `${progressBar}\n` +
            `\`${elapsed} / ${song.durationFormatted}\`\n\n` +
            `Requested by <@${song.requestedBy}>`,
        )
        .setThumbnail(song.thumbnail || null);
}

export function createSongAddedEmbed(song: Song, position: number): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`${EMOJIS.SUCCESS} Added to Queue`)
        .setDescription(
            `**[${song.title}](${song.url})**\n` +
            `${song.channelName} · \`${song.durationFormatted}\` · Position: **#${position}**`,
        )
        .setThumbnail(song.thumbnail || null);
}

export function createPlaylistAddedEmbed(title: string, count: number): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`${EMOJIS.SUCCESS} Playlist Added`)
        .setDescription(`**${title}**\n${EMOJIS.MUSIC} \`${count}\` songs added to queue`);
}

export function createMixStartedEmbed(title: string, firstSong: Song, totalCount: number): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.NOW_PLAYING)
        .setTitle(`${EMOJIS.MUSIC} Mix Loaded`)
        .setDescription(
            `**${title}**\n` +
            `\`${totalCount}\` songs · Next tracks will auto-queue\n\n` +
            `Now playing: **[${firstSong.title}](${firstSong.url})**\n` +
            `${firstSong.channelName} · \`${firstSong.durationFormatted}\``,
        )
        .setThumbnail(firstSong.thumbnail || null);
}

export function createSearchEmbed(query: string, songs: Song[]): EmbedBuilder {
    const description = songs
        .map(
            (song, i) =>
                `**${i + 1}.** [${song.title}](${song.url})\n` +
                `╰ ${song.channelName} · \`${song.durationFormatted}\``,
        )
        .join('\n\n');

    return new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.SEARCH} Results for "${query}"`)
        .setDescription(description)
        .setFooter({ text: 'Select a song using the menu below' });
}

export function createQueueEmbed(
    songs: Song[],
    currentSong: Song | null,
    page: number,
    totalPages: number,
    totalSongs?: number,
): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.QUEUE} Music Queue`);

    let description = '';

    if (currentSong) {
        description += `${EMOJIS.MUSIC} **Now Playing**\n`;
        description += `[${currentSong.title}](${currentSong.url}) · \`${currentSong.durationFormatted}\`\n\n`;
    }

    if (songs.length === 0) {
        description += '*Queue is empty — use `/play` to add songs*';
    } else {
        const offset = (page - 1) * QUEUE_PAGE_SIZE;
        description += songs
            .map(
                (song, i) =>
                    `\`${offset + i + 1}.\` [${song.title}](${song.url}) · \`${song.durationFormatted}\``,
            )
            .join('\n');
    }

    embed.setDescription(description);

    const songCount = totalSongs ?? songs.length;
    embed.setFooter({ text: `Page ${page}/${totalPages} · ${songCount} song(s) in queue` });

    return embed;
}

export function createErrorEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder().setColor(COLORS.ERROR).setDescription(`${EMOJIS.ERROR} ${message}`);
}

export function createSuccessEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setDescription(`${EMOJIS.SUCCESS} ${message}`);
}
