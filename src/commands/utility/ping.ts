import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';

const pingCommand: Command = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Show bot latency'),
    cooldown: 5,
    execute: async (interaction) => {
        const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });

        const wsLatency = interaction.client.ws.ping;
        const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply(
            `🏓 **Pong!**\n` +
            `> WebSocket: \`${wsLatency}ms\`\n` +
            `> API: \`${apiLatency}ms\``,
        );
    },
};

export default pingCommand;
