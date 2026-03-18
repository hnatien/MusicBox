import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { createSuccessEmbed } from '../../utils/embed.js';
import { EMOJIS } from '../../utils/constants.js';
import { requireVoiceChannel, requireQueue } from '../../utils/guards.js';

const stopCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playback, clear queue, and disconnect'),
    cooldown: 3,

    execute: async (interaction) => {
        if (!(await requireVoiceChannel(interaction))) return;

        const queue = await requireQueue(interaction);
        if (!queue) return;

        musicPlayer.stop(interaction.guildId!);

        await interaction.reply({
            embeds: [createSuccessEmbed(`${EMOJIS.STOP} Playback stopped and queue cleared.`)],
        });
    },
};

export default stopCommand;
