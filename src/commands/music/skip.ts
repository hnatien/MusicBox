import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { createSuccessEmbed } from '../../utils/embed.js';
import { EMOJIS } from '../../utils/constants.js';
import { requireVoiceChannel, requirePlaying } from '../../utils/guards.js';

const skipCommand: Command = {
    data: new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),
    cooldown: 2,

    execute: async (interaction) => {
        if (!(await requireVoiceChannel(interaction))) return;

        const queue = await requirePlaying(interaction);
        if (!queue) return;

        const skippedTitle = queue.currentSong!.title;
        musicPlayer.skip(interaction.guildId!);

        await interaction.reply({
            embeds: [createSuccessEmbed(`${EMOJIS.SKIP} Skipped **${skippedTitle}**`)],
        });
    },
};

export default skipCommand;
