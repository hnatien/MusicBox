import { GuildMember, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as queueManager from '../../services/queueManager.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embed.js';
import { EMOJIS } from '../../utils/constants.js';

const volumeCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the playback volume')
        .addIntegerOption((option) =>
            option
                .setName('level')
                .setDescription('Volume level (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100),
        ) as unknown as SlashCommandBuilder,
    cooldown: 2,

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

        const level = interaction.options.getInteger('level', true);
        musicPlayer.setVolume(interaction.guildId!, level);

        await interaction.reply({
            embeds: [createSuccessEmbed(`${EMOJIS.VOLUME} Volume set to **${level}%**`)],
        });
    },
};

export default volumeCommand;
