import { config } from './config/environment.js';
import { MusicClient } from './core/client.js';
import { logger } from './core/logger.js';
import { loadCommands } from './commands/index.js';
import { loadEvents } from './events/index.js';
import { startWebServer } from './services/webServer.js';
import { database } from './services/database.js';
import { deployCommands } from './scripts/deploy-commands.js';

async function main(): Promise<void> {
    const client = new MusicClient();

    // Initialize Redis connection
    try {
        await database.connect();
        logger.info('Successfully connected to Redis at startup');
    } catch (error) {
        logger.warn('Initial Redis connection failed, will retry on demand');
    }

    // Deploy commands for production
    if (process.env.NODE_ENV === 'production') {
        try {
            await deployCommands();
            logger.info('Commands successfully deployed for production');
        } catch (error) {
            logger.error('Failed to deploy commands on startup', { error });
        }
    }

    await loadCommands(client);
    await loadEvents(client);

    startWebServer(client);

    await client.login(config.DISCORD_TOKEN);
}

async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    try {
        await database.disconnect();
    } catch (err) {
        logger.error('Error during Redis disconnect', err);
    }
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`, { stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    logger.error(`Unhandled rejection: ${message}`, { stack });
});

main().catch((error) => {
    logger.error('Failed to start bot', { error });
    process.exit(1);
});
