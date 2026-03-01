import type { BotEvent } from './index.js';
import * as queueManager from '../services/queueManager.js';
import { startInactivityTimer } from '../services/musicPlayer.js';
import { logger } from '../core/logger.js';

const voiceStateUpdateEvent: BotEvent<'voiceStateUpdate'> = {
    name: 'voiceStateUpdate',
    execute: async (client, oldState, newState) => {
        const botId = client.user?.id;
        if (!botId) return;

        const guildId = oldState.guild.id;
        const queue = queueManager.getQueue(guildId);
        if (!queue) return;

        const botVoiceChannel = oldState.guild.members.cache.get(botId)?.voice.channel;
        if (!botVoiceChannel) return;

        const nonBotMembers = botVoiceChannel.members.filter((member) => !member.user.bot);

        if (nonBotMembers.size === 0) {
            logger.info(`Voice channel empty in guild ${guildId}, disconnecting in 30s`);

            startInactivityTimer(guildId, 30);
        } else if (queue.inactivityTimer) {
            clearTimeout(queue.inactivityTimer);
            queue.inactivityTimer = null;
        }
    },
};

export default voiceStateUpdateEvent;
