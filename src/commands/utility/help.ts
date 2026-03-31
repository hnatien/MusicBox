import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import { renderHelpImage } from '../../utils/canvasRenderer.js';
import { APP_EMOJIS } from '../../utils/constants.js';

const helpCommand: Command = {
    data: new SlashCommandBuilder().setName('help').setDescription('Show all available commands'),
    cooldown: 5,
    execute: async (interaction) => {
        await interaction.deferReply();

        const categories = [
            {
                name: 'Music',
                commands: [
                    { name: 'play', description: 'Play by URL or search', args: 'query', emojiId: APP_EMOJIS.PLAY, color: '#FF2D55' },
                    { name: 'search', description: 'Search and pick a track', args: 'query', emojiId: APP_EMOJIS.SEARCH, color: '#FF9500' },
                    { name: 'skip', description: 'Go to next track', emojiId: APP_EMOJIS.SKIP, color: '#007AFF' },
                    { name: 'stop', description: 'End playback session', emojiId: APP_EMOJIS.STOP, color: '#FF3B30' },
                    { name: 'nowplaying', description: 'Show current track', emojiId: APP_EMOJIS.NOWPLAYING, color: '#5856D6' },
                    { name: 'queue', description: 'View upcoming tracks', emojiId: APP_EMOJIS.QUEUE, color: '#4CD964' },
                    { name: 'volume', description: 'Set audio level', args: '1-100', emojiId: APP_EMOJIS.VOLUME, color: '#AF52DE' },
                    { name: 'pause /resume', description: 'Halt or continue playback', emojiId: APP_EMOJIS.RESUME, color: '#FFCC00' },
                ],
            },
            {
                name: 'System',
                commands: [
                    { name: 'ping', description: 'Show latency', emojiId: APP_EMOJIS.PING, color: '#8E8E93' },
                    { name: 'help', description: 'Show this menu', emojiId: APP_EMOJIS.HELP, color: '#2C2C2E' },
                ],
            },
        ];

        try {
            const buffer = await renderHelpImage(categories);
            const attachment = new AttachmentBuilder(buffer, { name: 'help.png' });

            await interaction.editReply({ 
                content: 'Các lệnh của **MusicBox**:',
                files: [attachment] 
            });
        } catch (error) {
            console.error('Error rendering help image:', error);
            await interaction.editReply('Có lỗi xảy ra khi tạo danh sách lệnh. Vui lòng thử lại sau.');
        }
    },
};

export default helpCommand;
