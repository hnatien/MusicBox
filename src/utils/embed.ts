import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { COLORS, EMOJIS, PROGRESS_BAR_LENGTH, QUEUE_PAGE_SIZE } from './constants.js';
import { createProgressBar, formatDuration } from './formatDuration.js';
import type { Song } from '../models/song.js';

export function createNowPlayingEmbed(song: Song, elapsedSeconds: number, isPaused: boolean = false): { embeds: EmbedBuilder[], components: ActionRowBuilder<ButtonBuilder>[] } {
    const progressBar = createProgressBar(elapsedSeconds, song.duration, 15);
    const elapsed = formatDuration(elapsedSeconds);
    const total = song.durationFormatted;

    const embed = new EmbedBuilder()
        .setColor(COLORS.NOW_PLAYING)
        .setAuthor({ name: song.channelName.toUpperCase() })
        .setTitle(song.title)
        .setURL(song.url)
        .setDescription(
            `\n${progressBar}\n` +
            `**${elapsed}** / ${total}\n\n` +
            `*Shared by <@${song.requestedBy}>*`
        )
        .setImage(song.thumbnail || null);

    const playPauseButton = new ButtonBuilder()
        .setCustomId('player-pause-resume')
        .setEmoji(isPaused ? EMOJIS.RESUME : EMOJIS.PAUSE)
        .setStyle(ButtonStyle.Secondary);

    const skipButton = new ButtonBuilder()
        .setCustomId('player-skip')
        .setEmoji(EMOJIS.SKIP)
        .setStyle(ButtonStyle.Secondary);

    const stopButton = new ButtonBuilder()
        .setCustomId('player-stop')
        .setEmoji(EMOJIS.STOP)
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(playPauseButton, skipButton, stopButton);

    return { embeds: [embed], components: [row] };
}

export function createSongAddedEmbed(song: Song, position: number): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setAuthor({ name: 'ADDED TO QUEUE' })
        .setTitle(song.title)
        .setURL(song.url)
        .setDescription(
            `**${song.channelName}** · \`${song.durationFormatted}\`\n` +
            `Position **#${position}**`,
        )
        .setThumbnail(song.thumbnail || null);
}

export function createPlaylistAddedEmbed(title: string, count: number): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setAuthor({ name: 'PLAYLIST ADDED' })
        .setTitle(title)
        .setDescription(`\`${count}\` items queued`);
}

export function createMixStartedEmbed(title: string, firstSong: Song, totalCount: number): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.NOW_PLAYING)
        .setAuthor({ name: 'MIX LOADED' })
        .setTitle(title)
        .setDescription(
            `􀑬 \`${totalCount}\` items · Auto-queue enabled\n\n` +
            `Now playing **[${firstSong.title}](${firstSong.url})**\n` +
            `${firstSong.channelName} · \`${firstSong.durationFormatted}\``,
        )
        .setThumbnail(firstSong.thumbnail || null);
}

export function createSearchEmbed(query: string, songs: Song[]): EmbedBuilder {
    const description = songs
        .map(
            (song, i) =>
                `\`${i + 1}\` **[${song.title}](${song.url})**\n` +
                `╰ ${song.channelName} · \`${song.durationFormatted}\``,
        )
        .join('\n\n');

    return new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setAuthor({ name: 'SEARCH RESULTS' })
        .setTitle(`"${query}"`)
        .setDescription(description)
        .setFooter({ text: '􀊫 Select a song using the menu below' });
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
        .setAuthor({ name: 'MUSIC QUEUE' });

    let description = '';

    if (currentSong) {
        description += `**NOW PLAYING**\n`;
        description += `[${currentSong.title}](${currentSong.url}) · \`${currentSong.durationFormatted}\`\n\n`;
        description += `**UP NEXT**\n`;
    }

    if (songs.length === 0) {
        description += '*Queue is empty — use `/play` to add songs*';
    } else {
        const offset = (page - 1) * QUEUE_PAGE_SIZE;
        description += songs
            .map(
                (song, i) =>
                    `\`${offset + i + 1}\` **[${song.title}](${song.url})**\n` +
                    `╰ ${song.channelName} · \`${song.durationFormatted}\``,
            )
            .join('\n\n');
    }

    if (totalSongs && totalSongs > 0) {
        embed.setFooter({ text: `􀑬 ${totalSongs} songs in queue · Page ${page}/${totalPages}` });
    }

    return embed;
}

export function createErrorEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setAuthor({ name: 'System Error' })
        .setDescription(message);
}

export function createSuccessEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setAuthor({ name: 'Success' })
        .setDescription(message);
}
