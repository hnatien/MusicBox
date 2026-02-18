import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MusicClient } from '../core/client.js';
import type { Command } from '../models/command.js';
import { logger } from '../core/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Recursively load all command files from subdirectories and register them on the client.
 */
export async function loadCommands(client: MusicClient): Promise<void> {
    const commandDirs = readdirSync(__dirname, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((dir) => dir.name);

    for (const dir of commandDirs) {
        const dirPath = join(__dirname, dir);
        const commandFiles = readdirSync(dirPath).filter(
            (file) => file.endsWith('.ts') || file.endsWith('.js'),
        );

        for (const file of commandFiles) {
            const filePath = join(dirPath, file);
            const module = await import(`file://${filePath}`);
            const command: Command = module.default;

            if (!command?.data?.name) {
                logger.warn(`Command file ${file} is missing a valid export.`);
                continue;
            }

            client.commands.set(command.data.name, command);
            logger.info(`Loaded command: /${command.data.name}`);
        }
    }
}
