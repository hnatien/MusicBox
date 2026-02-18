import type { BotEvent } from './index.js';
import { logger } from '../core/logger.js';

const readyEvent: BotEvent<'ready'> = {
    name: 'ready',
    once: true,
    execute: async (client) => {
        logger.info(`Ready! Logged in as ${client.user?.tag} (${client.user?.id})`);
        logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
    },
};

export default readyEvent;
