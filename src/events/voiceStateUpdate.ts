import type { BotEvent } from './index.js';
import * as queueManager from '../services/queueManager.js';
import { startInactivityTimer } from '../services/musicPlayer.js';
import { logger } from '../core/logger.js';

const voiceStateUpdateEvent: BotEvent<'voiceStateUpdate'> = {
    name: 'voiceStateUpdate',
    execute: async (client, oldState, newState) => {
        // Only care about the bot's voice channel
        const botId = client.user?.id;
        if (!botId) return;

        const guildId = oldState.guild.id;
        const queue = queueManager.getQueue(guildId);
        if (!queue) return;

        // Get the voice channel the bot is in
        const botVoiceChannel = oldState.guild.members.cache.get(botId)?.voice.channel;
        if (!botVoiceChannel) return;

        // Check if the bot is alone in the voice channel (only bot remains)
        const nonBotMembers = botVoiceChannel.members.filter((member) => !member.user.bot);

        if (nonBotMembers.size === 0 && !queue.isPlaying) {
            logger.info(`Voice channel empty in guild ${guildId}, disconnecting in 30s`);

            // Only start disconnect timer if not playing. 
            // If playing, the standard inactivity timer kicks in after queue empties.
            // Start a short inactivity timer (30s) when channel is empty.
            // This is safer than a local setTimeout because it's cleared if music starts.
            startInactivityTimer(guildId, 30);
        }
    },
};

export default voiceStateUpdateEvent;
