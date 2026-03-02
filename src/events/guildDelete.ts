import type { BotEvent } from './index.js';
import { logger } from '../core/logger.js';

const guildDeleteEvent: BotEvent<'guildDelete'> = {
    name: 'guildDelete',
    execute: async (client, guild) => {
        logger.info(`Left a guild: ${guild.name} (${guild.id})`);
        client.updatePresence();
    },
};

export default guildDeleteEvent;
