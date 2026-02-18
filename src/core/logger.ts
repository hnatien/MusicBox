import winston from 'winston';
import { config } from '../config/environment.js';

export const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.printf((info) => {
            const { timestamp, level, message, stack, ...meta } = info;

            let metaStr = '';
            if (Object.keys(meta).length > 0) {
                try {
                    metaStr = ` ${JSON.stringify(meta, (key, value) => {
                        if (value instanceof Error) {
                            const errObj: any = { ...value };
                            return {
                                name: value.name,
                                message: value.message,
                                stack: value.stack,
                                ...errObj,
                            };
                        }
                        return typeof value === 'bigint' ? value.toString() : value;
                    })}`;
                } catch {
                    metaStr = ' [complex metadata]';
                }
            }

            const stackStr = stack ? `\n${stack}` : '';
            return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}${stackStr}`;
        }),
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize({ all: true })),
        }),
    ],
});
