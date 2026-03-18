import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function createNowPlayingButtons(
    guildId: string,
    isPaused: boolean,
): ActionRowBuilder<ButtonBuilder> {
    const pauseResumeButton = isPaused
        ? new ButtonBuilder()
            .setCustomId(`np:resume:${guildId}`)
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Success)
        : new ButtonBuilder()
            .setCustomId(`np:pause:${guildId}`)
            .setEmoji('⏸️')
            .setStyle(ButtonStyle.Secondary);

    const skipButton = new ButtonBuilder()
        .setCustomId(`np:skip:${guildId}`)
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Primary);

    const stopButton = new ButtonBuilder()
        .setCustomId(`np:stop:${guildId}`)
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        pauseResumeButton,
        skipButton,
        stopButton,
    );
}

export function createQueueButtons(
    guildId: string,
    currentPage: number,
    totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
    const prevButton = new ButtonBuilder()
        .setCustomId(`queue:page:${guildId}:${currentPage - 1}`)
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1);

    const pageIndicator = new ButtonBuilder()
        .setCustomId(`queue:info:${guildId}`)
        .setLabel(`${currentPage} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const nextButton = new ButtonBuilder()
        .setCustomId(`queue:page:${guildId}:${currentPage + 1}`)
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        prevButton,
        pageIndicator,
        nextButton,
    );
}
