import { Collection, type GuildMember } from 'discord.js';
import type { BotEvent } from './index.js';
import type { MusicClient } from '../core/client.js';
import { logger } from '../core/logger.js';
import * as musicPlayer from '../services/musicPlayer.js';
import * as queueManager from '../services/queueManager.js';
import { createErrorEmbed } from '../utils/embed.js';

const cooldowns = new Collection<string, Collection<string, number>>();

const interactionCreateEvent: BotEvent<'interactionCreate'> = {
    name: 'interactionCreate',
    execute: async (client, interaction) => {
        const musicClient = client as MusicClient;

        if (interaction.isButton()) {
            if (!interaction.guildId) return;
            const member = interaction.member as GuildMember;
            if (!member.voice.channel) {
                await interaction.reply({ embeds: [createErrorEmbed('You must be in a voice channel to use player controls.')], ephemeral: true });
                return;
            }

            const queue = queueManager.getQueue(interaction.guildId);
            if (!queue) {
                await interaction.reply({ embeds: [createErrorEmbed('No active queue found.')], ephemeral: true });
                return;
            }

            try {
                switch (interaction.customId) {
                    case 'player-pause-resume':
                        if (queue.isPaused) {
                            musicPlayer.resume(interaction.guildId);
                        } else {
                            musicPlayer.pause(interaction.guildId);
                        }
                        await interaction.deferUpdate();
                        break;
                    case 'player-skip':
                        musicPlayer.skip(interaction.guildId);
                        await interaction.deferUpdate();
                        break;
                    case 'player-stop':
                        musicPlayer.stop(interaction.guildId);
                        await interaction.deferUpdate();
                        break;
                }
            } catch (error) {
                logger.error(`Button interaction failed: ${interaction.customId}`, { error });
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        if (!interaction.guildId) {
            await interaction.reply({
                embeds: [createErrorEmbed('Commands can only be used in a server.')],
                ephemeral: true,
            });
            return;
        }

        const command = musicClient.commands.get(interaction.commandName);

        if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return;
        }

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
                    embeds: [createErrorEmbed(`Please wait **${timeLeft}s** before using \`/${command.data.name}\` again.`)],
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

            const errorEmbed = createErrorEmbed('An unexpected error occurred. Please try again later.');

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => { });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => { });
            }
        }
    },
};

export default interactionCreateEvent;
