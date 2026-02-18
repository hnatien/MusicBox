import { GuildMember, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import * as queueManager from '../../services/queueManager.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embed.js';
import { EMOJIS } from '../../utils/constants.js';

const stopCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playback, clear queue, and disconnect'),
    cooldown: 3,

    execute: async (interaction) => {
        const member = interaction.member as GuildMember;

        if (!member.voice.channel) {
            await interaction.reply({
                embeds: [createErrorEmbed('You must be in a voice channel.')],
                ephemeral: true,
            });
            return;
        }

        const queue = queueManager.getQueue(interaction.guildId!);

        if (!queue) {
            await interaction.reply({
                embeds: [createErrorEmbed('Nothing is playing right now.')],
                ephemeral: true,
            });
            return;
        }

        musicPlayer.stop(interaction.guildId!);

        await interaction.reply({
            embeds: [createSuccessEmbed(`${EMOJIS.STOP} Playback stopped and queue cleared.`)],
        });
    },
};

export default stopCommand;
