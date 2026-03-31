import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Command } from '../../models/command.js';
import { config } from '../../config/environment.js';
import { COLORS, formatAppEmoji } from '../../utils/constants.js';

const maintenanceCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Toggle maintenance mode (Admin only)')
        .addBooleanOption(option => 
            option.setName('status')
                .setDescription('Turn maintenance mode on or off')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        if (!config.ADMIN_IDS.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: `${formatAppEmoji('ERROR_CIRCLE')} Only bot admins can use this command.`, 
                ephemeral: true 
            });
        }

        const status = interaction.options.getBoolean('status', true);
        client.isLocked = status;

        const embed = new EmbedBuilder()
            .setColor(status ? COLORS.WARNING : COLORS.SUCCESS)
            .setTitle(`${formatAppEmoji(status ? 'ERROR_CIRCLE' : 'CHECK_CIRCLE')} Maintenance Mode`)
            .setDescription(`Maintenance mode has been **${status ? 'ENABLED' : 'DISABLED'}**.`)
            .addFields({ 
                name: 'Status', 
                value: status ? '🛑 Currently Down (Only admins can use commands)' : '✅ Active (All users can use commands)' 
            })
            .setTimestamp();

        // Update presence to reflect status
        if (status) {
            client.user?.setPresence({
                activities: [{ name: '⚠️ Maintenance Mode', type: 3 }], // Watching
                status: 'dnd'
            });
        } else {
            client.updatePresence();
        }

        await interaction.reply({ embeds: [embed] });
    }
};

export default maintenanceCommand;
