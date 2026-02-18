import { REST, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/environment.js';
import { logger } from '../core/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsDir = join(__dirname, '..', 'commands');

async function deployCommands(): Promise<void> {
    const commands: unknown[] = [];

    const commandDirs = readdirSync(commandsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((dir) => dir.name);

    for (const dir of commandDirs) {
        const dirPath = join(commandsDir, dir);
        const commandFiles = readdirSync(dirPath).filter(
            (file) => file.endsWith('.ts') || file.endsWith('.js'),
        );

        for (const file of commandFiles) {
            const filePath = join(dirPath, file);
            const module = await import(`file://${filePath}`);
            const command = module.default;

            if (command?.data?.toJSON) {
                commands.push(command.data.toJSON());
                logger.info(`Registered command: /${command.data.name}`);
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

    try {
        logger.info(`Deploying ${commands.length} slash command(s)...`);

        if (config.DEV_GUILD_ID) {
            // Guild-specific deployment (instant, for development)
            await rest.put(
                Routes.applicationGuildCommands(config.CLIENT_ID, config.DEV_GUILD_ID),
                { body: commands },
            );
            logger.info(`Successfully deployed to guild ${config.DEV_GUILD_ID}`);
        } else {
            // Global deployment (takes up to 1 hour to propagate)
            await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
            logger.info('Successfully deployed globally (may take up to 1 hour to propagate)');
        }
    } catch (error) {
        logger.error('Failed to deploy commands', { error });
        process.exit(1);
    }
}

deployCommands();
