import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActivityType } from 'discord.js';
import { Command } from '../../models/command.js';
import { config } from '../../config/environment.js';
import { COLORS, formatAppEmoji } from '../../utils/constants.js';
import { createErrorEmbed } from '../../utils/embed.js';

const maintenanceCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Toggle maintenance mode (Admin only)')
        .addBooleanOption(option => 
            option.setName('status')
                .setDescription('Turn maintenance mode on or off')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client): Promise<void> {
        if (!config.ADMIN_IDS.includes(interaction.user.id)) {
            await interaction.reply({
                embeds: [createErrorEmbed('Only bot admins can use this command.')],
                ephemeral: true
            });
            return;
        }

        const status = interaction.options.getBoolean('status', true);
        client.isLocked = status;

        const emojiKey = status ? 'ERROR_CIRCLE' : 'CHECK_CIRCLE';
        const color = status ? COLORS.WARNING : COLORS.SUCCESS;
        const statusValue = status ? '🛑 Currently Down (Only admins can use commands)' : '✅ Active (All users can use commands)';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${formatAppEmoji(emojiKey)} Maintenance Mode`)
            .setDescription(`Maintenance mode has been **${status ? 'ENABLED' : 'DISABLED'}**.`)
            .addFields({
                name: 'Status',
                value: statusValue
            })
            .setTimestamp();

        if (status) {
            client.user?.setPresence({
                activities: [{ name: '!under maintenance! | back soon', type: ActivityType.Playing }],
                status: 'dnd',
            });
        } else {
            client.updatePresence();
        }

        await interaction.reply({ embeds: [embed] });
    }
};

export default maintenanceCommand;
