import {
    ActionRowBuilder,
    ComponentType,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { Command } from '../../models/command.js';
import * as youtubeService from '../../services/youtubeService.js';
import * as queueManager from '../../services/queueManager.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { createSearchEmbed, createNowPlayingEmbed, createSongAddedEmbed, createErrorEmbed } from '../../utils/embed.js';
import { createNowPlayingButtons } from '../../utils/components.js';
import { MAX_QUERY_LENGTH, SELECTION_TIMEOUT_MS } from '../../utils/constants.js';
import { requireVoiceChannel, requireBotPermissions } from '../../utils/guards.js';
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
        const voiceChannel = await requireVoiceChannel(interaction);
        if (!voiceChannel) return;

        if (!(await requireBotPermissions(interaction, voiceChannel))) return;

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

            try {
                const selection = await response.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    filter: (i) => i.user.id === interaction.user.id,
                    time: SELECTION_TIMEOUT_MS,
                });

                const selectedIndex = parseInt(selection.values[0], 10);
                const song = results[selectedIndex];

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
                    const buttons = createNowPlayingButtons(interaction.guildId!, false);
                    await selection.update({
                        embeds: [createNowPlayingEmbed(song, 0)],
                        components: [buttons],
                    });
                    await musicPlayer.play(interaction.guildId!, client, selection.message);
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
