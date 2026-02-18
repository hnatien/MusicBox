import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as queueManager from '../../services/queueManager.js';
import { createQueueEmbed, createErrorEmbed } from '../../utils/embed.js';
import { QUEUE_PAGE_SIZE } from '../../utils/constants.js';

const queueCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the song queue')
        .addIntegerOption((option) =>
            option.setName('page').setDescription('Page number').setMinValue(1),
        ) as unknown as SlashCommandBuilder,
    cooldown: 3,

    execute: async (interaction) => {
        const queue = queueManager.getQueue(interaction.guildId!);

        if (!queue || (!queue.currentSong && queue.songs.length === 0)) {
            await interaction.reply({
                embeds: [createErrorEmbed('The queue is empty. Use `/play` to add songs.')],
                ephemeral: true,
            });
            return;
        }

        const totalPages = Math.max(1, Math.ceil(queue.songs.length / QUEUE_PAGE_SIZE));
        const requestedPage = interaction.options.getInteger('page') ?? 1;
        const page = Math.min(Math.max(1, requestedPage), totalPages);

        const startIndex = (page - 1) * QUEUE_PAGE_SIZE;
        const pageSongs = queue.songs.slice(startIndex, startIndex + QUEUE_PAGE_SIZE);

        const embed = createQueueEmbed(pageSongs, queue.currentSong, page, totalPages, queue.songs.length);

        await interaction.reply({ embeds: [embed] });
    },
};

export default queueCommand;
