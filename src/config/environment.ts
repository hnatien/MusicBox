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

function getEnv(name: string): string | undefined {
    const value = process.env[name];
    if (!value) return undefined;

    return value.trim().replace(/^['"]|['"]$/g, '');
}

function validateEnv(): EnvironmentConfig {
    const requiredVars = ['DISCORD_TOKEN', 'CLIENT_ID'] as const;

    for (const varName of requiredVars) {
        if (!getEnv(varName)) {
            throw new Error(`Missing required environment variable: ${varName}`);
        }
    }

    return {
        DISCORD_TOKEN: getEnv('DISCORD_TOKEN')!,
        CLIENT_ID: getEnv('CLIENT_ID')!,
        DEV_GUILD_ID: getEnv('DEV_GUILD_ID') || undefined,
        LOG_LEVEL: getEnv('LOG_LEVEL') || 'info',
        DEFAULT_VOLUME: parseInt(getEnv('DEFAULT_VOLUME') || '50', 10),
        MAX_QUEUE_SIZE: parseInt(getEnv('MAX_QUEUE_SIZE') || '100', 10),
        INACTIVITY_TIMEOUT: parseInt(getEnv('INACTIVITY_TIMEOUT') || '300', 10),
    };
}

export const config = validateEnv();
