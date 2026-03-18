import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as youtubeService from '../../services/youtubeService.js';
import * as queueManager from '../../services/queueManager.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { isValidYouTubeUrl, isPlaylistUrl, isMixUrl } from '../../utils/validation.js';
import { createSongAddedEmbed, createErrorEmbed, createNowPlayingEmbed, createPlaylistAddedEmbed, createMixStartedEmbed } from '../../utils/embed.js';
import { createNowPlayingButtons } from '../../utils/components.js';
import { MAX_QUERY_LENGTH } from '../../utils/constants.js';
import { requireVoiceChannel, requireBotPermissions } from '../../utils/guards.js';
import { logger } from '../../core/logger.js';

const playCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song by YouTube URL or search term')
        .addStringOption((option) =>
            option.setName('query').setDescription('YouTube URL or search keywords').setRequired(true),
        ) as SlashCommandBuilder,
    cooldown: 3,

    execute: async (interaction, client) => {
        const voiceChannel = await requireVoiceChannel(interaction);
        if (!voiceChannel) return;

        if (!(await requireBotPermissions(interaction, voiceChannel))) return;

        const query = interaction.options.getString('query', true).slice(0, MAX_QUERY_LENGTH);

        await interaction.deferReply();

        try {
            let queue = queueManager.getQueue(interaction.guildId!);
            const isNewQueue = !queue;

            if (!queue) {
                const connection = musicPlayer.joinChannel(voiceChannel);
                queue = queueManager.createQueue(interaction.guildId!, {
                    textChannelId: interaction.channelId,
                    voiceChannelId: voiceChannel.id,
                    connection,
                });
            }

            if (isValidYouTubeUrl(query) && isMixUrl(query)) {
                const { title, songs } = await youtubeService.getPlaylistInfo(query, interaction.user.id);

                if (songs.length === 0) {
                    await interaction.editReply({ embeds: [createErrorEmbed('This mix is empty or unavailable.')] });
                    return;
                }

                const firstSong = songs[0];
                const remainingSongs = songs.slice(1);

                queueManager.setMixContext(interaction.guildId!, remainingSongs, title);
                queueManager.addSong(interaction.guildId!, firstSong);

                const embed = createMixStartedEmbed(title, firstSong, songs.length);

                if (isNewQueue || !queue.isPlaying) {
                    const message = await interaction.editReply({ embeds: [embed] });
                    await musicPlayer.play(interaction.guildId!, client, message);
                } else {
                    await interaction.editReply({ embeds: [embed] });
                }
                return;
            }

            if (isValidYouTubeUrl(query) && isPlaylistUrl(query)) {
                const { title, songs } = await youtubeService.getPlaylistInfo(query, interaction.user.id);

                if (songs.length === 0) {
                    await interaction.editReply({ embeds: [createErrorEmbed('The playlist is empty or private.')] });
                    return;
                }

                let addedCount = 0;
                for (const s of songs) {
                    try {
                        queueManager.addSong(interaction.guildId!, s);
                        addedCount++;
                    } catch {
                        break;
                    }
                }

                const embed = createPlaylistAddedEmbed(title, addedCount);
                if (addedCount < songs.length) {
                    embed.setFooter({ text: `Skipped ${songs.length - addedCount} songs (Queue full)` });
                }

                if (isNewQueue || !queue.isPlaying) {
                    const message = await interaction.editReply({ embeds: [embed] });
                    await musicPlayer.play(interaction.guildId!, client, message);
                } else {
                    await interaction.editReply({ embeds: [embed] });
                }
                return;
            }

            let song;
            if (isValidYouTubeUrl(query)) {
                song = await youtubeService.getInfoByUrl(query, interaction.user.id);
            } else {
                const results = await youtubeService.searchByQuery(query, interaction.user.id);
                if (results.length === 0) {
                    await interaction.editReply({ embeds: [createErrorEmbed(`No results found for **${query}**.`)] });
                    return;
                }
                song = results[0];
            }

            const position = queueManager.addSong(interaction.guildId!, song);

            if (isNewQueue || !queue.isPlaying) {
                const embed = createNowPlayingEmbed(song, 0);
                const buttons = createNowPlayingButtons(interaction.guildId!, false);
                const message = await interaction.editReply({ embeds: [embed], components: [buttons] });
                await musicPlayer.play(interaction.guildId!, client, message);
            } else {
                await interaction.editReply({ embeds: [createSongAddedEmbed(song, position)] });
            }
        } catch (error) {
            logger.error('Play command failed', { error, query });

            await interaction.editReply({
                embeds: [createErrorEmbed('Failed to play the requested song. Please try again.')],
            });
        }
    },
};

export default playCommand;
