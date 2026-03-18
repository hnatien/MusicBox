import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import { COLORS } from '../../utils/constants.js';

const pingCommand: Command = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Show bot latency'),
    cooldown: 5,
    execute: async (interaction) => {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });

        const wsLatency = interaction.client.ws.ping;
        const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('Pong!')
            .setDescription(
                `**WebSocket:** \`${wsLatency}ms\`\n` +
                `**API:** \`${apiLatency}ms\``,
            );

        await interaction.editReply({ content: '', embeds: [embed] });
    },
};

export default pingCommand;
