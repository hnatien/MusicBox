import { config } from './config/environment.js';
import { MusicClient } from './core/client.js';
import { logger } from './core/logger.js';
import { loadCommands } from './commands/index.js';
import { loadEvents } from './events/index.js';

async function main(): Promise<void> {
    const client = new MusicClient();

    await loadCommands(client);
    await loadEvents(client);

    await client.login(config.DISCORD_TOKEN);
}

function shutdown(signal: string): void {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
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
