import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import { COLORS } from '../../utils/constants.js';

const helpCommand: Command = {
    data: new SlashCommandBuilder().setName('help').setDescription('Show all available commands'),
    cooldown: 5,
    execute: async (interaction) => {
        const clientUser = interaction.client.user;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setAuthor({
                name: 'MUSIC BOX HELP CENTER',
            })
            .setDescription('Explore all available commands.')
            .addFields(
                {
                    name: 'MUSIC',
                    value: [
                        '**/play** `<query>` · Play by URL or search',
                        '**/search** `<query>` · Search and pick',
                        '**/skip** · Go to next track',
                        '**/stop** · End playback session',
                        '**/nowplaying** · Show track details',
                        '**/queue** · View upcoming tracks',
                        '**/volume** `<1-100>` · Set audio level',
                        '**/pause** · Halt playback',
                        '**/resume** · Continue playback',
                    ].join('\n'),
                },
                {
                    name: 'SYSTEM',
                    value: [
                        '**/ping** · Show latency',
                        '**/help** · Show this menu',
                        '**/update** · Recent changes',
                    ].join('\n'),
                },
            );

        await interaction.reply({ embeds: [embed] });
    },
};

export default helpCommand;
