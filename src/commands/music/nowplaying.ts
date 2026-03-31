import { SlashCommandBuilder } from 'discord.js';
import { AudioPlayerStatus, type AudioPlayerPlayingState } from '@discordjs/voice';
import type { Command } from '../../models/command.js';
import * as queueManager from '../../services/queueManager.js';
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

        let elapsed = 0;
        if (queue.player.state.status === AudioPlayerStatus.Playing || queue.player.state.status === AudioPlayerStatus.Paused) {
            const state = queue.player.state as AudioPlayerPlayingState;
            elapsed = Math.floor(state.resource.playbackDuration / 1000);
        } else if (queue.playStartTime) {
            elapsed = Math.floor((Date.now() - queue.playStartTime) / 1000);
        }

        const result = createNowPlayingEmbed(queue.currentSong, elapsed, queue.isPaused, queue.repeatMode, queue.repeatCount);

        const message = await interaction.reply({ embeds: result.embeds, components: result.components, fetchReply: true });
        
        // Update the current now playing message to this one
        // and restart the progress update interval
        if (message) {
            queue.nowPlayingMessage = message;
            const { startProgressUpdate } = await import('../../services/musicPlayer.js');
            startProgressUpdate(interaction.guildId!);
        }
    },
};

export default nowPlayingCommand;
