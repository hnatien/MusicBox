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
        version: '1.3.0',
        date: '2026-03-31',
        improved: [
            'Refactor toàn bộ UI theo phong cách Apple Music Minimalism',
            'Đồng bộ hóa hệ thống biểu tượng SF Symbols và typography',
            'Tối ưu hóa Now Playing với cover art lớn và thanh tiến trình siêu mỏng',
        ],
    },
    {
        version: '1.2.0',
        date: '2026-02-21',
        added: [
            'Command `/update` · Xem changelog trong Discord',
        ],
        improved: [
            'Xử lý YouTube playlist và Mix URL chính xác hơn',
            'Cache metadata giảm thời gian chờ',
        ],
    },
];

const CATEGORY_LABELS: { key: keyof Pick<ChangelogEntry, 'added' | 'improved' | 'fixed'>; label: string }[] = [
    { key: 'added', label: 'NEW' },
    { key: 'improved', label: 'IMPROVED' },
    { key: 'fixed', label: 'FIXED' },
];

const updateCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Xem những cập nhật mới nhất'),
    cooldown: 10,

    execute: async (interaction) => {
        const entries = CHANGELOG.slice(0, 2);

        const description = entries
            .map((entry) => {
                const header = `### v${entry.version}  ·  ${entry.date}`;
                const sections = CATEGORY_LABELS
                    .filter(({ key }) => entry[key]?.length)
                    .map(({ key, label }) =>
                        `**${label}**\n` +
                        entry[key]!.map((item) => `· ${item}`).join('\n'),
                    )
                    .join('\n');
                return `${header}\n${sections}`;
            })
            .join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setAuthor({ name: 'MUSIC BOX CHANGELOG' })
            .setDescription(description);

        await interaction.reply({ embeds: [embed] });
    },
};

export default updateCommand;
