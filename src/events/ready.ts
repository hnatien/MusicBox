import type { BotEvent } from './index.js';
import { logger } from '../core/logger.js';

const readyEvent: BotEvent<'ready'> = {
    name: 'ready',
    once: true,
    execute: async (client) => {
        client.updatePresence();

        const serverCount = client.guilds.cache.size;

        logger.info(`Ready! Logged in as ${client.user?.tag} (${client.user?.id})`);
        logger.info(`Serving ${serverCount} guild(s)`);
    },
};

export default readyEvent;
