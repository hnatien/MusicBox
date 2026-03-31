import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { COLORS, EMOJIS, PROGRESS_BAR_LENGTH, QUEUE_PAGE_SIZE, APP_EMOJIS, formatAppEmoji, getEmojiUrl } from './constants.js';
import { createProgressBar, formatDuration, formatRemainingDuration } from './formatDuration.js';
import type { Song } from '../models/song.js';

export function createNowPlayingEmbed(song: Song, elapsedSeconds: number, isPaused: boolean = false, repeatMode: 'off' | 'one' | 'all' = 'off', repeatCount: number = 0): { embeds: EmbedBuilder[], components: ActionRowBuilder<ButtonBuilder>[] } {
    const progressBar = createProgressBar(elapsedSeconds, song.duration, 20);
    const elapsed = formatDuration(elapsedSeconds);
    const total = song.durationFormatted;

    const repeatLabels = {
        off: '',
        one: repeatCount > 0 ? `\n\n*Repeat: One (${repeatCount} ${repeatCount === 1 ? 'time' : 'times'})*` : '\n\n*Repeat: One*',
        all: repeatCount > 0 ? `\n\n*Repeat: All (${repeatCount} ${repeatCount === 1 ? 'time' : 'times'})*` : '\n\n*Repeat: All*'
    };

    const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: song.channelName.toUpperCase(), iconURL: getEmojiUrl(APP_EMOJIS.MUSIC_NOTES) })
        .setTitle(song.title)
        .setURL(song.url)
        .setImage(song.thumbnail || null)
        .setDescription(
            `\n**${elapsed}** ${progressBar} ${total}\n\n` +
            `${formatAppEmoji('HEART')} *Shared by <@${song.requestedBy}>*` +
            `${repeatLabels[repeatMode]}`
        );

    const playPauseButton = new ButtonBuilder()
        .setCustomId('player-pause-resume')
        .setEmoji({ id: isPaused ? APP_EMOJIS.PLAY : APP_EMOJIS.PAUSE })
        .setStyle(ButtonStyle.Secondary);

    const skipButton = new ButtonBuilder()
        .setCustomId('player-skip')
        .setEmoji({ id: APP_EMOJIS.SKIP })
        .setStyle(ButtonStyle.Secondary);

    const repeatButton = new ButtonBuilder()
        .setCustomId('player-repeat')
        .setEmoji({ id: APP_EMOJIS.REPEAT })
        .setStyle(repeatMode === 'off' ? ButtonStyle.Secondary : ButtonStyle.Primary);

    const stopButton = new ButtonBuilder()
        .setCustomId('player-stop')
        .setEmoji({ id: APP_EMOJIS.STOP })
        .setStyle(ButtonStyle.Secondary);

    const queueButton = new ButtonBuilder()
        .setCustomId('player-queue-view')
        .setEmoji({ id: APP_EMOJIS.QUEUE })
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(playPauseButton, skipButton, repeatButton, queueButton, stopButton);

    return { embeds: [embed], components: [row] };
}

export function createSongAddedEmbed(song: Song, position: number): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setAuthor({ name: 'ADDED TO QUEUE', iconURL: getEmojiUrl(APP_EMOJIS.CHECK_CIRCLE) })
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
        .setAuthor({ name: 'PLAYLIST ADDED', iconURL: getEmojiUrl(APP_EMOJIS.PLAYLIST) })
        .setTitle(title)
        .setDescription(`\`${count}\` items queued`);
}

export function createMixStartedEmbed(title: string, firstSong: Song, totalCount: number): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.NOW_PLAYING)
        .setAuthor({ name: 'MIX LOADED' })
        .setTitle(title)
        .setDescription(
            `\`${totalCount}\` items · Auto-queue enabled\n\n` +
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
        .setFooter({ text: 'Select a song using the menu below' });
}

export function createQueueEmbed(
    allSongs: Song[],
    currentSong: Song | null,
    paginatedSongs: Song[],
    page: number,
    totalPages: number,
    totalSongsCount: number,
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<any>[] } {
    const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'MUSIC QUEUE', iconURL: getEmojiUrl(APP_EMOJIS.QUEUE) });

    let description = '';

    if (currentSong) {
        description += `**NOW PLAYING**\n`;
        description += `[${currentSong.title}](${currentSong.url})\n`;
        description += `${formatAppEmoji('HEART')} *Shared by <@${currentSong.requestedBy}>*\n\n`;
    }

    if (paginatedSongs.length > 0) {
        description += `**UP NEXT**\n`;
        const offset = (page - 1) * QUEUE_PAGE_SIZE;
        description += paginatedSongs
            .map(
                (song, i) =>
                    `\`${offset + i + 1}\` [${song.title}](${song.url}) · \`${song.durationFormatted}\` <@${song.requestedBy}>`,
            )
            .join('\n');
    } else if (allSongs.length === 0) {
        description += '*No more songs in queue*';
    }

    embed.setDescription(description);

    if (totalSongsCount > 0) {
        embed.setFooter({ text: `${totalSongsCount} ${totalSongsCount === 1 ? 'song' : 'songs'} in queue · Page ${page}/${totalPages}` });
    }

    const allSongsRow = new ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>();
    
    if (allSongs.length > 0) {
        allSongsRow.addComponents(
            new ButtonBuilder()
                .setCustomId('queue-clear')
                .setLabel('Clear Queue')
                .setEmoji(APP_EMOJIS.TRASH)
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('queue-remove-last')
                .setLabel('Remove Last')
                .setEmoji(APP_EMOJIS.MINUS_SQUARE)
                .setStyle(ButtonStyle.Secondary)
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('queue-remove-song')
            .setPlaceholder('Select a song to remove')
            .addOptions(
                allSongs.slice(0, 25).map((song, index) => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${index + 1}. ${song.title.slice(0, 90)}`)
                        .setDescription(`Duration: ${song.durationFormatted} · Added by ${song.requestedBy}`)
                        .setValue(index.toString())
                )
            );

        const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        return {
            embeds: [embed],
            components: [allSongsRow, selectRow]
        };
    }

    return {
        embeds: [embed],
        components: allSongsRow.components.length > 0 ? [allSongsRow] : []
    };
}

export function createErrorEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setAuthor({ name: 'System Error', iconURL: getEmojiUrl(APP_EMOJIS.ERROR_CIRCLE) })
        .setDescription(message);
}

export function createSuccessEmbed(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setAuthor({ name: 'Success', iconURL: getEmojiUrl(APP_EMOJIS.CHECK_CIRCLE) })
        .setDescription(message);
}

export function createStoppedEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: 'MUSICBOX STOPPED', iconURL: getEmojiUrl(APP_EMOJIS.STOP) })
        .setDescription('*The playback has been stopped and the queue cleared.*');
}