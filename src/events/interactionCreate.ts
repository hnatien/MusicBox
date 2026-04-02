import { Collection, GuildMember } from 'discord.js';
import type { AudioPlayerPlayingState } from '@discordjs/voice';
import type { BotEvent } from './index.js';
import type { MusicClient } from '../core/client.js';
import { logger } from '../core/logger.js';
import * as musicPlayer from '../services/musicPlayer.js';
import * as queueManager from '../services/queueManager.js';
import {
  createErrorEmbed,
  createNowPlayingEmbed,
  createStoppedEmbed,
  createQueueEmbed,
} from '../utils/embed.js';
import { QUEUE_PAGE_SIZE, formatAppEmoji, getEmojiUrl, APP_EMOJIS } from '../utils/constants.js';
import { config } from '../config/environment.js';

const cooldowns = new Collection<string, Collection<string, number>>();

const interactionCreateEvent: BotEvent<'interactionCreate'> = {
  name: 'interactionCreate',
  execute: async (client, interaction) => {
    const musicClient = client as MusicClient;

    if (musicClient.isLocked && !config.ADMIN_IDS.includes(interaction.user.id)) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'The bot is currently down for maintenance. Please try again later.',
            ).setAuthor({
              name: 'MAINTENANCE MODE',
              iconURL: getEmojiUrl(APP_EMOJIS.ERROR_CIRCLE),
            }),
          ],
          ephemeral: true,
        });
      }
      return;
    }

    if (interaction.isButton()) {
      if (!interaction.guildId) {
        return;
      }

      const member = interaction.member;
      if (!(member instanceof GuildMember) || !member.voice.channel) {
        await interaction.reply({
          embeds: [createErrorEmbed('You must be in a voice channel to use player controls.')],
          ephemeral: true,
        });
        return;
      }

      const queue = queueManager.getQueue(interaction.guildId);
      if (!queue) {
        await interaction.reply({
          embeds: [createErrorEmbed('No active queue found.')],
          ephemeral: true,
        });
        return;
      }

      try {
        switch (interaction.customId) {
          case 'player-pause-resume': {
            if (queue.isPaused) {
              musicPlayer.resume(interaction.guildId);
            } else {
              musicPlayer.pause(interaction.guildId);
            }
            await interaction.deferUpdate();
            break;
          }
          case 'player-skip': {
            if (
              queue.mixContext ||
              (queue.currentSong?.url &&
                queue.currentSong.url.includes('list=') &&
                !queue.currentSong.url.includes('list=RD'))
            ) {
              await interaction.reply({
                embeds: [
                  createErrorEmbed(
                    'The skip feature is temporarily locked due to an issue, we will fix it soon.',
                  ),
                ],
                ephemeral: true,
              });
              return;
            }
            musicPlayer.skip(interaction.guildId);
            await interaction.deferUpdate();
            break;
          }
          case 'player-queue-view': {
            const totalSongsCount = queue.songs.length;
            const tPages = Math.max(1, Math.ceil(totalSongsCount / QUEUE_PAGE_SIZE));
            const result = createQueueEmbed(
              queue.songs,
              queue.currentSong,
              queue.songs.slice(0, QUEUE_PAGE_SIZE),
              1,
              tPages,
              totalSongsCount,
            );
            await interaction.reply({ embeds: result.embeds, components: result.components });
            break;
          }
          case 'queue-clear': {
            queue.songs = [];
            const result = createQueueEmbed([], queue.currentSong, [], 1, 1, 0);
            await interaction.update({
              content: `${formatAppEmoji('CHECK_CIRCLE')} Cleared queue.`,
              embeds: result.embeds,
              components: [],
            });
            break;
          }
          case 'queue-remove-last': {
            if (queue.songs.length > 0) {
              const removed = queue.songs.pop();
              const total = queue.songs.length;
              const tPages = Math.max(1, Math.ceil(total / QUEUE_PAGE_SIZE));
              const result = createQueueEmbed(
                queue.songs,
                queue.currentSong,
                queue.songs.slice(0, QUEUE_PAGE_SIZE),
                1,
                tPages,
                total,
              );
              await interaction.update({
                content: `${formatAppEmoji('CHECK_CIRCLE')} Removed **${removed?.title}** from queue.`,
                embeds: result.embeds,
                components: result.components,
              });
            } else {
              await interaction.reply({ content: 'Queue is already empty.', ephemeral: true });
            }
            break;
          }
          case 'player-stop': {
            const stopQueue = queueManager.getQueue(interaction.guildId);
            if (stopQueue?.nowPlayingMessage) {
              await stopQueue.nowPlayingMessage
                .edit({ embeds: [createStoppedEmbed()], components: [] })
                .catch(function (): void {});
            }
            musicPlayer.stop(interaction.guildId);
            await interaction.deferUpdate();
            break;
          }
          case 'player-repeat': {
            const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
            const nextMode = modes[(modes.indexOf(queue.repeatMode) + 1) % modes.length];
            queue.repeatMode = nextMode;
            queue.repeatCount = 0; // Reset count when changing mode

            // Update UI
            if (queue.nowPlayingMessage && queue.currentSong) {
              const playbackDuration =
                (queue.player.state as AudioPlayerPlayingState).resource?.playbackDuration ?? 0;
              const elapsedSeconds = Math.floor(playbackDuration / 1000);
              const result = createNowPlayingEmbed(
                queue.currentSong,
                elapsedSeconds,
                queue.isPaused,
                queue.repeatMode,
                queue.repeatCount,
              );
              await queue.nowPlayingMessage
                .edit({ embeds: result.embeds, components: result.components })
                .catch(function (): void {});
            }
            await interaction.deferUpdate();
            break;
          }
        }
      } catch (error) {
        logger.error(`Button interaction failed: ${interaction.customId}`, { error });
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (!interaction.guildId) {
        return;
      }

      const queue = queueManager.getQueue(interaction.guildId);
      if (!queue) {
        return;
      }

      if (interaction.customId === 'queue-remove-song') {
        const songIndex = parseInt(interaction.values[0]);
        if (!isNaN(songIndex) && queue.songs[songIndex]) {
          const removedSong = queue.songs.splice(songIndex, 1)[0];
          const totalSongsCount = queue.songs.length;
          const tPages = Math.max(1, Math.ceil(totalSongsCount / QUEUE_PAGE_SIZE));
          const upNext = queue.songs.slice(0, QUEUE_PAGE_SIZE);
          const result = createQueueEmbed(
            queue.songs,
            queue.currentSong,
            upNext,
            1,
            tPages,
            totalSongsCount,
          );
          await interaction.update({
            content: `${formatAppEmoji('CHECK_CIRCLE')} Removed **${removedSong.title}** (requested by <@${removedSong.requestedBy}>) from queue.`,
            embeds: result.embeds,
            components: result.components,
          });
        }
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
          embeds: [
            createErrorEmbed(
              `Please wait **${timeLeft}s** before using \`/${command.data.name}\` again.`,
            ),
          ],
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
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  },
};

export default interactionCreateEvent;
