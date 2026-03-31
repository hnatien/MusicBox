import 'dotenv/config';

interface EnvironmentConfig {
    DISCORD_TOKEN: string;
    CLIENT_ID: string;
    DEV_GUILD_ID?: string;
    LOG_LEVEL: string;
    DEFAULT_VOLUME: number;
    MAX_QUEUE_SIZE: number;
    INACTIVITY_TIMEOUT: number;
    REDIS: {
        HOST: string;
        PORT: number;
        USER: string;
        PASS: string;
        URL: string;
    };
    ADMIN_IDS: string[];
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

    const host = getEnv('REDISHOST') || getEnv('RAILWAY_PRIVATE_DOMAIN') || 'localhost';
    const port = parseInt(getEnv('REDISPORT') || '6379', 10);
    const user = getEnv('REDISUSER') || 'default';
    const pass = getEnv('REDISPASSWORD') || getEnv('REDIS_PASSWORD') || '';
    
    // Construct URL: Luôn ưu tiên xây dựng lại URL từ các thành phần để tránh lỗi nội suy ${} trong .env
    const url = pass 
        ? `redis://${user}:${pass}@${host}:${port}`
        : `redis://${host}:${port}`;

    return {
        DISCORD_TOKEN: getEnv('DISCORD_TOKEN')!,
        CLIENT_ID: getEnv('CLIENT_ID')!,
        DEV_GUILD_ID: getEnv('DEV_GUILD_ID') || undefined,
        LOG_LEVEL: getEnv('LOG_LEVEL') || 'info',
        DEFAULT_VOLUME: parseInt(getEnv('DEFAULT_VOLUME') || '50', 10),
        MAX_QUEUE_SIZE: parseInt(getEnv('MAX_QUEUE_SIZE') || '100', 10),
        INACTIVITY_TIMEOUT: parseInt(getEnv('INACTIVITY_TIMEOUT') || '300', 10),
        REDIS: {
            HOST: host,
            PORT: port,
            USER: user,
            PASS: pass,
            URL: url // URL đã được build chuẩn ở trên
        },
        ADMIN_IDS: (getEnv('ADMIN_IDS') || '').split(',').map(id => id.trim()).filter(id => !!id)
    };
}

export const config = validateEnv();
