import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../models/command.js';
import { COLORS } from '../../utils/constants.js';

interface ChangelogEntry {
    version: string;
    date: string;
    added?: string[];
    improved?: string[];
    fixed?: string[];
}

const CHANGELOG: ChangelogEntry[] = [
    {
        version: '1.2.0',
        date: '2026-02-21',
        added: [
            'Command `/update` — xem changelog ngay trong Discord',
        ],
        improved: [
            'Xử lý YouTube playlist và Mix URL chính xác hơn',
            'Cache metadata giảm thời gian chờ khi phát lại bài cũ',
        ],
    },
    {
        version: '1.1.0',
        date: '2026-02-18',
        added: [
            'Hỗ trợ YouTube Music URL',
            'Command `/volume` — điều chỉnh âm lượng 1–100',
            'Phân trang cho `/queue`',
        ],
        improved: [
            'Tự động reconnect khi mất kết nối voice',
        ],
    },
    {
        version: '1.0.0',
        date: '2026-02-15',
        added: [
            'Phát nhạc từ YouTube qua `/play`',
            'Tìm kiếm và chọn bài qua `/search`',
            'Điều khiển: `/skip`, `/stop`, `/pause`, `/resume`',
            'Xem hàng đợi qua `/queue`',
        ],
    },
];

const CATEGORY_LABELS: { key: keyof Pick<ChangelogEntry, 'added' | 'improved' | 'fixed'>; label: string }[] = [
    { key: 'added', label: '✨ New' },
    { key: 'improved', label: '⚡ Improved' },
    { key: 'fixed', label: '🐛 Fixed' },
];

const DEFAULT_DISPLAY_COUNT = 3;

const updateCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('View the latest bot updates'),
    cooldown: 10,

    execute: async (interaction) => {
        const entries = CHANGELOG.slice(0, DEFAULT_DISPLAY_COUNT);

        const description = entries
            .map((entry) => {
                const header = `### v${entry.version}  •  ${entry.date}`;
                const sections = CATEGORY_LABELS
                    .filter(({ key }) => entry[key]?.length)
                    .map(({ key, label }) =>
                        `> **${label}**\n` +
                        entry[key]!.map((item) => `> • ${item}`).join('\n'),
                    )
                    .join('\n');
                return `${header}\n${sections}`;
            })
            .join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('Music Box — Changelog')
            .setDescription(description)
            .setFooter({
                text: `Showing ${entries.length}/${CHANGELOG.length} versions`,
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

export default updateCommand;
