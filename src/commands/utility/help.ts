import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import { COLORS } from '../../utils/constants.js';

const helpCommand: Command = {
    data: new SlashCommandBuilder().setName('help').setDescription('Show all available commands'),
    cooldown: 5,
    execute: async (interaction) => {
        const clientUser = interaction.client.user;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setAuthor({
                name: `${clientUser?.username || 'Music Box'} Help Center`,
                iconURL: clientUser?.displayAvatarURL() || undefined,
            })
            .setDescription('Here is a list of all available commands.')
            .addFields(
                {
                    name: 'Music',
                    value: [
                        '**/play** `<query>` — Play a song by URL or search term',
                        '**/search** `<query>` — Search YouTube and pick a song',
                        '**/skip** — Skip the current song',
                        '**/stop** — Stop playback and clear the queue',
                        '**/pause** — Pause the current song',
                        '**/resume** — Resume playback',
                        '**/volume** `<1-100>` — Set the volume',
                        '**/queue** — View the song queue',
                        '**/nowplaying** — Show current track info',
                    ].join('\n'),
                },
                {
                    name: 'Utility',
                    value: [
                        '**/ping** — Show bot latency',
                        '**/help** — Show this help message',
                        '**/update** — Xem những cập nhật mới nhất',
                    ].join('\n'),
                },
            )
            .setFooter({ text: 'Music Box' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

export default helpCommand;
