import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { createSuccessEmbed } from '../../utils/embed.js';
import { EMOJIS } from '../../utils/constants.js';
import { requireVoiceChannel, requireQueue } from '../../utils/guards.js';

const volumeCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set or view the playback volume')
        .addIntegerOption((option) =>
            option
                .setName('level')
                .setDescription('Volume level (1-100). Omit to see current volume.')
                .setMinValue(1)
                .setMaxValue(100),
        ) as unknown as SlashCommandBuilder,
    cooldown: 2,

    execute: async (interaction) => {
        if (!(await requireVoiceChannel(interaction))) return;

        const queue = await requireQueue(interaction);
        if (!queue) return;

        const level = interaction.options.getInteger('level');

        if (level === null) {
            const currentVolume = Math.round(queue.volume * 100);
            await interaction.reply({
                embeds: [createSuccessEmbed(`${EMOJIS.VOLUME} Current volume: **${currentVolume}%**`)],
            });
            return;
        }

        musicPlayer.setVolume(interaction.guildId!, level);

        await interaction.reply({
            embeds: [createSuccessEmbed(`${EMOJIS.VOLUME} Volume set to **${level}%**`)],
        });
    },
};

export default volumeCommand;
