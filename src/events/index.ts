import { readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientEvents } from 'discord.js';
import type { MusicClient } from '../core/client.js';
import { logger } from '../core/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const runtimeExtension = extname(fileURLToPath(import.meta.url));

interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
    name: K;
    once?: boolean;
    execute: (client: MusicClient, ...args: ClientEvents[K]) => Promise<void> | void;
}

export async function loadEvents(client: MusicClient): Promise<void> {
    const eventFiles = readdirSync(__dirname).filter(
        (file) => {
            if (file === 'index.ts' || file === 'index.js' || file === 'index.d.ts') {
                return false;
            }

            if (runtimeExtension === '.ts') {
                return file.endsWith('.ts') && !file.endsWith('.d.ts');
            }

            return file.endsWith('.js');
        },
    );

    for (const file of eventFiles) {
        const filePath = join(__dirname, file);
        const module = await import(`file://${filePath}`);
        const event: BotEvent = module.default;

        if (!event?.name) {
            logger.warn(`Event file ${file} is missing a valid export.`);
            continue;
        }

        if (event.once) {
            client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
            client.on(event.name, (...args) => event.execute(client, ...args));
        }

        logger.info(`Loaded event: ${event.name}${event.once ? ' (once)' : ''}`);
    }
}

export type { BotEvent };
