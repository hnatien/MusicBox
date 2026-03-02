import type { BotEvent } from './index.js';
import { logger } from '../core/logger.js';

const guildCreateEvent: BotEvent<'guildCreate'> = {
    name: 'guildCreate',
    execute: async (client, guild) => {
        logger.info(`Joined a new guild: ${guild.name} (${guild.id})`);
        client.updatePresence();
    },
};

export default guildCreateEvent;
