import 'dotenv/config';

interface EnvironmentConfig {
    DISCORD_TOKEN: string;
    CLIENT_ID: string;
    DEV_GUILD_ID?: string;
    LOG_LEVEL: string;
    DEFAULT_VOLUME: number;
    MAX_QUEUE_SIZE: number;
    INACTIVITY_TIMEOUT: number;
}

function validateEnv(): EnvironmentConfig {
    const requiredVars = ['DISCORD_TOKEN', 'CLIENT_ID'] as const;

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            throw new Error(`Missing required environment variable: ${varName}`);
        }
    }

    return {
        DISCORD_TOKEN: process.env.DISCORD_TOKEN!,
        CLIENT_ID: process.env.CLIENT_ID!,
        DEV_GUILD_ID: process.env.DEV_GUILD_ID || undefined,
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        DEFAULT_VOLUME: parseInt(process.env.DEFAULT_VOLUME || '50', 10),
        MAX_QUEUE_SIZE: parseInt(process.env.MAX_QUEUE_SIZE || '100', 10),
        INACTIVITY_TIMEOUT: parseInt(process.env.INACTIVITY_TIMEOUT || '300', 10),
    };
}

export const config = validateEnv();
