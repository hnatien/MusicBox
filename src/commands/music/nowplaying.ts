import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as queueManager from '../../services/queueManager.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { createNowPlayingEmbed, createErrorEmbed } from '../../utils/embed.js';

const nowPlayingCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),
    cooldown: 3,

    execute: async (interaction) => {
        const queue = queueManager.getQueue(interaction.guildId!);

        if (!queue || !queue.currentSong) {
            await interaction.reply({
                embeds: [createErrorEmbed('Nothing is playing right now.')],
                ephemeral: true,
            });
            return;
        }

        const elapsed = musicPlayer.getElapsedSeconds(interaction.guildId!);
        const embed = createNowPlayingEmbed(queue.currentSong, elapsed, queue.isPaused);

        await interaction.reply({ embeds: [embed] });
    },
};

export default nowPlayingCommand;
