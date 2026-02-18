import { Collection } from 'discord.js';
import type { BotEvent } from './index.js';
import type { MusicClient } from '../core/client.js';
import { logger } from '../core/logger.js';

// Cooldown tracker: Map<commandName, Map<userId, expirationTimestamp>>
const cooldowns = new Collection<string, Collection<string, number>>();

const interactionCreateEvent: BotEvent<'interactionCreate'> = {
    name: 'interactionCreate',
    execute: async (client, interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const musicClient = client as MusicClient;
        const command = musicClient.commands.get(interaction.commandName);

        if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return;
        }

        // Cooldown check
        const cooldownAmount = (command.cooldown ?? 3) * 1000;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const timestamps = cooldowns.get(command.data.name)!;
        const now = Date.now();

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                await interaction.reply({
                    content: `⏳ Please wait **${timeLeft}s** before using \`/${command.data.name}\` again.`,
                    ephemeral: true,
                });
                return;
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        try {
            await command.execute(interaction, musicClient);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            logger.error(`Command /${command.data.name} failed: ${message}`, {
                stack,
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });

            const errorMessage = '❌ An unexpected error occurred. Please try again later.';

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(() => { });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => { });
            }
        }
    },
};

export default interactionCreateEvent;
