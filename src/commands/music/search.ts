import {
    ActionRowBuilder,
    ComponentType,
    GuildMember,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { Command } from '../../models/command.js';
import * as youtubeService from '../../services/youtubeService.js';
import * as queueManager from '../../services/queueManager.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { createSearchEmbed, createNowPlayingEmbed, createSongAddedEmbed, createErrorEmbed } from '../../utils/embed.js';
import { MAX_QUERY_LENGTH, SELECTION_TIMEOUT_MS } from '../../utils/constants.js';
import { logger } from '../../core/logger.js';

const searchCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search YouTube and pick a song to play')
        .addStringOption((option) =>
            option.setName('query').setDescription('Search keywords').setRequired(true),
        ) as SlashCommandBuilder,
    cooldown: 5,

    execute: async (interaction, client) => {
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            await interaction.reply({
                embeds: [createErrorEmbed('You must be in a voice channel to use this command.')],
                ephemeral: true,
            });
            return;
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user!);
        if (!permissions?.has(['Connect', 'Speak'])) {
            await interaction.reply({
                embeds: [createErrorEmbed('I need **Connect** and **Speak** permissions in your voice channel.')],
                ephemeral: true,
            });
            return;
        }

        const query = interaction.options.getString('query', true).slice(0, MAX_QUERY_LENGTH);

        await interaction.deferReply();

        try {
            const results = await youtubeService.searchByQuery(query, interaction.user.id);

            if (results.length === 0) {
                await interaction.editReply({
                    embeds: [createErrorEmbed(`No results found for **${query}**.`)],
                });
                return;
            }

            // Build select menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`search-select-${interaction.id}`)
                .setPlaceholder('Choose a song...')
                .addOptions(
                    results.map((song, index) =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${index + 1}. ${song.title}`.slice(0, 100))
                            .setDescription(`${song.channelName} • ${song.durationFormatted}`.slice(0, 100))
                            .setValue(index.toString()),
                    ),
                );

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

            const response = await interaction.editReply({
                embeds: [createSearchEmbed(query, results)],
                components: [row],
            });

            // Wait for user selection
            try {
                const selection = await response.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    filter: (i) => i.user.id === interaction.user.id,
                    time: SELECTION_TIMEOUT_MS,
                });

                const selectedIndex = parseInt(selection.values[0], 10);
                const song = results[selectedIndex];

                // Get or create queue
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

                const position = queueManager.addSong(interaction.guildId!, song);

                if (isNewQueue || !queue.isPlaying) {
                    await musicPlayer.play(interaction.guildId!, client);
                    await selection.update({
                        embeds: [createNowPlayingEmbed(song, 0)],
                        components: [],
                    });
                } else {
                    await selection.update({
                        embeds: [createSongAddedEmbed(song, position)],
                        components: [],
                    });
                }
            } catch {
                await interaction.editReply({
                    embeds: [createErrorEmbed('Selection timed out. Please try again.')],
                    components: [],
                });
            }
        } catch (error) {
            logger.error('Search command failed', { error, query });

            await interaction.editReply({
                embeds: [createErrorEmbed('Search failed. Please try again.')],
            });
        }
    },
};

export default searchCommand;
