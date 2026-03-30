import 'dotenv/config';

interface EnvironmentConfig {
    DISCORD_TOKEN: string;
    CLIENT_ID: string;
    DEV_GUILD_ID?: string;
    LOG_LEVEL: string;
    DEFAULT_VOLUME: number;
    MAX_QUEUE_SIZE: number;
    INACTIVITY_TIMEOUT: number;
    YOUTUBE_BROWSER?: string;
    YOUTUBE_COOKIE?: string;
}

function validateEnv(): EnvironmentConfig {
    const requiredVars = ['DISCORD_TOKEN', 'CLIENT_ID'] as const;

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            throw new Error(`Missing required environment variable: ${varName}`);
        }
    }

    const youtubeAuth = process.env.YOUTUBE_BROWSER || process.env.YOUTUBE_COOKIE;
    if (!youtubeAuth) {
        console.warn(
            'WARNING: YouTube authentication not configured. Set YOUTUBE_BROWSER or YOUTUBE_COOKIE in .env to avoid "Sign in to confirm you\'re not a bot" errors.'
        );
    }

    return {
        DISCORD_TOKEN: process.env.DISCORD_TOKEN!,
        CLIENT_ID: process.env.CLIENT_ID!,
        DEV_GUILD_ID: process.env.DEV_GUILD_ID || undefined,
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        DEFAULT_VOLUME: parseInt(process.env.DEFAULT_VOLUME || '50', 10),
        MAX_QUEUE_SIZE: parseInt(process.env.MAX_QUEUE_SIZE || '100', 10),
        INACTIVITY_TIMEOUT: parseInt(process.env.INACTIVITY_TIMEOUT || '300', 10),
        YOUTUBE_BROWSER: process.env.YOUTUBE_BROWSER || undefined,
        YOUTUBE_COOKIE: process.env.YOUTUBE_COOKIE || undefined,
    };
}

export const config = validateEnv();
