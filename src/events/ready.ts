import type { BotEvent } from './index.js';
import { ActivityType } from 'discord.js';
import { logger } from '../core/logger.js';

const readyEvent: BotEvent<'ready'> = {
    name: 'ready',
    once: true,
    execute: async (client) => {
        const serverCount = client.guilds.cache.size;

        client.user?.setPresence({
            activities: [{ name: `!help for commands! | meowing in ${serverCount} servers`, type: ActivityType.Playing }],
            status: 'online',
        });

        logger.info(`Ready! Logged in as ${client.user?.tag} (${client.user?.id})`);
        logger.info(`Serving ${serverCount} guild(s)`);
    },
};

export default readyEvent;
