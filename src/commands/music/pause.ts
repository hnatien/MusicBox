import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embed.js';
import { EMOJIS } from '../../utils/constants.js';
import { requireVoiceChannel, requirePlaying } from '../../utils/guards.js';

const pauseCommand: Command = {
    data: new SlashCommandBuilder().setName('pause').setDescription('Pause the current song'),
    cooldown: 2,

    execute: async (interaction) => {
        if (!(await requireVoiceChannel(interaction))) return;

        const queue = await requirePlaying(interaction);
        if (!queue) return;

        if (queue.isPaused) {
            await interaction.reply({
                embeds: [createErrorEmbed('Playback is already paused. Use `/resume` to continue.')],
                ephemeral: true,
            });
            return;
        }

        musicPlayer.pause(interaction.guildId!);
        await musicPlayer.updateNowPlayingMessage(interaction.guildId!);

        await interaction.reply({
            embeds: [createSuccessEmbed(`${EMOJIS.PAUSE} Paused **${queue.currentSong!.title}**`)],
        });
    },
};

export default pauseCommand;
