import { GuildMember, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as queueManager from '../../services/queueManager.js';
import * as musicPlayer from '../../services/musicPlayer.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embed.js';

const skipCommand: Command = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),
  cooldown: 2,

  execute: async (interaction) => {
    const member = interaction.member as GuildMember;

    if (!member.voice.channel) {
      await interaction.reply({
        embeds: [createErrorEmbed('You must be in a voice channel.')],
        ephemeral: true,
      });
      return;
    }

    const queue = queueManager.getQueue(interaction.guildId!);

    if (!queue || !queue.currentSong) {
      await interaction.reply({
        embeds: [createErrorEmbed('Nothing is playing right now.')],
        ephemeral: true,
      });
      return;
    }

    // Check if the current song is part of a Mix or Playlist
    // Mixes have mixContext, and Playlists (at least for now) can be detected by url or simply by having queue.songs.length > 0 if we want to be strict
    if (
      queue.mixContext ||
      (queue.currentSong.url &&
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

    const skippedTitle = queue.currentSong.title;
    musicPlayer.skip(interaction.guildId!);

    await interaction.reply({
      embeds: [createSuccessEmbed(`Skipped **${skippedTitle}**`)],
    });
  },
};

export default skipCommand;
