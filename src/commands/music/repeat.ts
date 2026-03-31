import { GuildMember, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import * as queueManager from '../../services/queueManager.js';
import { createSuccessEmbed, createErrorEmbed, createNowPlayingEmbed } from '../../utils/embed.js';
import { APP_EMOJIS, formatAppEmoji } from '../../utils/constants.js';
import { AudioPlayerStatus } from '@discordjs/voice';

const repeatCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('repeat')
        .setDescription('Toggle repeat mode (Off, One, All)')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('The repeat mode to set')
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'One (Loop current song)', value: 'one' },
                    { name: 'All (Loop entire queue)', value: 'all' }
                )),
    cooldown: 5,

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
        if (!queue) {
            await interaction.reply({
                embeds: [createErrorEmbed('No active queue found.')],
                ephemeral: true,
            });
            return;
        }

        const selectedMode = interaction.options.getString('mode') as 'off' | 'one' | 'all' | null;
        
        if (selectedMode) {
            queue.repeatMode = selectedMode;
        } else {
            // Cycle through modes: off -> one -> all -> off
            const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
            queue.repeatMode = modes[(modes.indexOf(queue.repeatMode) + 1) % modes.length];
        }

        const modeLabels = {
            off: 'Off',
            one: 'Loop One (Current Song)',
            all: 'Loop All (Entire Queue)'
        };

        // Update UI if a song is playing
        if (queue.nowPlayingMessage && queue.currentSong) {
            const playbackDuration = (queue.player.state as any).resource?.playbackDuration || 0;
            const elapsedSeconds = Math.floor(playbackDuration / 1000);
            const result = createNowPlayingEmbed(queue.currentSong, elapsedSeconds, queue.isPaused, queue.repeatMode);
            await queue.nowPlayingMessage.edit({ embeds: result.embeds, components: result.components }).catch(() => { });
        }

        await interaction.reply({
            embeds: [createSuccessEmbed(`Repeat mode set to **${modeLabels[queue.repeatMode]}**`)],
        });
    },
};

export default repeatCommand;