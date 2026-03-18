import { describe, it, expect } from 'vitest';
import {
    COLORS,
    EMOJIS,
    MAX_QUERY_LENGTH,
    SEARCH_RESULTS_COUNT,
    QUEUE_PAGE_SIZE,
    SELECTION_TIMEOUT_MS,
    PROGRESS_BAR_LENGTH,
    MAX_RECONNECT_ATTEMPTS,
    STREAM_RETRY_ATTEMPTS,
    YTDLP_TIMEOUT_MS,
} from '../../src/utils/constants.js';

describe('constants', () => {
    describe('COLORS', () => {
        it('has all required color values as numbers', () => {
            expect(typeof COLORS.PRIMARY).toBe('number');
            expect(typeof COLORS.SUCCESS).toBe('number');
            expect(typeof COLORS.WARNING).toBe('number');
            expect(typeof COLORS.ERROR).toBe('number');
            expect(typeof COLORS.INFO).toBe('number');
            expect(typeof COLORS.NOW_PLAYING).toBe('number');
        });

        it('colors are valid hex values (0x000000 - 0xFFFFFF)', () => {
            for (const color of Object.values(COLORS)) {
                expect(color).toBeGreaterThanOrEqual(0);
                expect(color).toBeLessThanOrEqual(0xffffff);
            }
        });
    });

    describe('EMOJIS', () => {
        it('has all required emoji keys', () => {
            const requiredKeys = [
                'MUSIC', 'SEARCH', 'QUEUE', 'SKIP', 'PAUSE', 'RESUME',
                'STOP', 'VOLUME', 'ERROR', 'WARNING', 'SUCCESS', 'LOADING',
            ];
            for (const key of requiredKeys) {
                expect(EMOJIS).toHaveProperty(key);
                expect(typeof EMOJIS[key as keyof typeof EMOJIS]).toBe('string');
            }
        });
    });

    describe('numeric constants', () => {
        it('has sensible default values', () => {
            expect(MAX_QUERY_LENGTH).toBe(200);
            expect(SEARCH_RESULTS_COUNT).toBe(5);
            expect(QUEUE_PAGE_SIZE).toBe(10);
            expect(SELECTION_TIMEOUT_MS).toBe(60_000);
            expect(PROGRESS_BAR_LENGTH).toBe(20);
            expect(MAX_RECONNECT_ATTEMPTS).toBe(3);
            expect(STREAM_RETRY_ATTEMPTS).toBe(3);
            expect(YTDLP_TIMEOUT_MS).toBe(30_000);
        });

        it('all values are positive', () => {
            expect(MAX_QUERY_LENGTH).toBeGreaterThan(0);
            expect(SEARCH_RESULTS_COUNT).toBeGreaterThan(0);
            expect(QUEUE_PAGE_SIZE).toBeGreaterThan(0);
            expect(SELECTION_TIMEOUT_MS).toBeGreaterThan(0);
            expect(PROGRESS_BAR_LENGTH).toBeGreaterThan(0);
            expect(MAX_RECONNECT_ATTEMPTS).toBeGreaterThan(0);
            expect(STREAM_RETRY_ATTEMPTS).toBeGreaterThan(0);
            expect(YTDLP_TIMEOUT_MS).toBeGreaterThan(0);
        });
    });
});
