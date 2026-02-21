import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import { COLORS, EMOJIS } from '../../utils/constants.js';

const helpCommand: Command = {
    data: new SlashCommandBuilder().setName('help').setDescription('Show all available commands'),
    cooldown: 5,
    execute: async (interaction) => {
        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`${EMOJIS.MUSIC} Music Box — Help`)
            .setDescription('Here are all the available commands:')
            .addFields(
                {
                    name: `${EMOJIS.MUSIC} Music`,
                    value: [
                        '`/play <query>` — Play a song by URL or search term',
                        '`/search <query>` — Search YouTube and pick a song',
                        '`/skip` — Skip the current song',
                        '`/stop` — Stop playback and clear the queue',
                        '`/pause` — Pause the current song',
                        '`/resume` — Resume playback',
                        '`/volume <1-100>` — Set the volume',
                        '`/queue` — View the song queue',
                        '`/nowplaying` — Show current track info',
                    ].join('\n'),
                },
                {
                    name: '🔧 Utility',
                    value: [
                        '`/ping` — Show bot latency',
                        '`/help` — Show this help message',
                        '`/update` — Xem những cập nhật mới nhất',
                    ].join('\n'),
                },
            )
            .setFooter({ text: 'Music Box • Made with ❤️' });

        await interaction.reply({ embeds: [embed] });
    },
};

export default helpCommand;
