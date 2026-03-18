import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import { COLORS } from '../../utils/constants.js';

const helpCommand: Command = {
    data: new SlashCommandBuilder().setName('help').setDescription('Show all available commands'),
    cooldown: 5,
    execute: async (interaction, client) => {
        const clientUser = interaction.client.user;

        const categories = new Map<string, Command[]>();

        for (const [, command] of client.commands) {
            const category = command.category ?? 'other';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(command);
        }

        const fields: { name: string; value: string }[] = [];

        for (const [category, commands] of categories) {
            const name = category.charAt(0).toUpperCase() + category.slice(1);
            const value = commands
                .map((cmd) => `**/${cmd.data.name}** — ${cmd.data.description}`)
                .join('\n');
            fields.push({ name, value });
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setAuthor({
                name: `${clientUser?.username || 'Music Box'} Help Center`,
                iconURL: clientUser?.displayAvatarURL() || undefined,
            })
            .setDescription('Here is a list of all available commands.')
            .addFields(fields)
            .setFooter({ text: 'Music Box' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

export default helpCommand;
