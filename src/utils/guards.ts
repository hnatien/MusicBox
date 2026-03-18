import { GuildMember, type ChatInputCommandInteraction, type VoiceBasedChannel } from 'discord.js';
import { createErrorEmbed } from './embed.js';
import * as queueManager from '../services/queueManager.js';
import type { GuildQueue } from '../models/guildQueue.js';

export async function requireVoiceChannel(
    interaction: ChatInputCommandInteraction,
): Promise<VoiceBasedChannel | null> {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        await interaction.reply({
            embeds: [createErrorEmbed('You must be in a voice channel to use this command.')],
            ephemeral: true,
        });
        return null;
    }

    return voiceChannel;
}

export async function requireBotPermissions(
    interaction: ChatInputCommandInteraction,
    voiceChannel: VoiceBasedChannel,
): Promise<boolean> {
    const permissions = voiceChannel.permissionsFor(interaction.client.user!);

    if (!permissions?.has(['Connect', 'Speak'])) {
        await interaction.reply({
            embeds: [createErrorEmbed('I need **Connect** and **Speak** permissions in your voice channel.')],
            ephemeral: true,
        });
        return false;
    }

    return true;
}

export async function requireQueue(
    interaction: ChatInputCommandInteraction,
): Promise<GuildQueue | null> {
    const queue = queueManager.getQueue(interaction.guildId!);

    if (!queue) {
        await interaction.reply({
            embeds: [createErrorEmbed('Nothing is playing right now.')],
            ephemeral: true,
        });
        return null;
    }

    return queue;
}

export async function requirePlaying(
    interaction: ChatInputCommandInteraction,
): Promise<GuildQueue | null> {
    const queue = queueManager.getQueue(interaction.guildId!);

    if (!queue || !queue.currentSong) {
        await interaction.reply({
            embeds: [createErrorEmbed('Nothing is playing right now.')],
            ephemeral: true,
        });
        return null;
    }

    return queue;
}
