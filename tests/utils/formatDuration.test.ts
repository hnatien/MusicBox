import { describe, it, expect } from 'vitest';
import { formatDuration, formatTotalDuration, createProgressBar } from '../../src/utils/formatDuration.js';

describe('formatDuration', () => {
    it('formats zero seconds', () => {
        expect(formatDuration(0)).toBe('0:00');
    });

    it('formats seconds under a minute', () => {
        expect(formatDuration(5)).toBe('0:05');
        expect(formatDuration(30)).toBe('0:30');
        expect(formatDuration(59)).toBe('0:59');
    });

    it('formats minutes and seconds', () => {
        expect(formatDuration(60)).toBe('1:00');
        expect(formatDuration(61)).toBe('1:01');
        expect(formatDuration(125)).toBe('2:05');
        expect(formatDuration(599)).toBe('9:59');
    });

    it('formats hours with zero-padded minutes', () => {
        expect(formatDuration(3600)).toBe('1:00:00');
        expect(formatDuration(3661)).toBe('1:01:01');
        expect(formatDuration(7200)).toBe('2:00:00');
        expect(formatDuration(3723)).toBe('1:02:03');
    });

    it('handles negative numbers', () => {
        expect(formatDuration(-1)).toBe('0:00');
        expect(formatDuration(-100)).toBe('0:00');
    });

    it('handles non-finite values', () => {
        expect(formatDuration(NaN)).toBe('0:00');
        expect(formatDuration(Infinity)).toBe('0:00');
        expect(formatDuration(-Infinity)).toBe('0:00');
    });

    it('floors fractional seconds', () => {
        expect(formatDuration(1.9)).toBe('0:01');
        expect(formatDuration(61.7)).toBe('1:01');
    });
});

describe('formatTotalDuration', () => {
    it('returns "0m" for zero, negative, and non-finite values', () => {
        expect(formatTotalDuration(0)).toBe('0m');
        expect(formatTotalDuration(-100)).toBe('0m');
        expect(formatTotalDuration(NaN)).toBe('0m');
        expect(formatTotalDuration(Infinity)).toBe('0m');
    });

    it('formats minutes only when under an hour', () => {
        expect(formatTotalDuration(60)).toBe('1m');
        expect(formatTotalDuration(300)).toBe('5m');
        expect(formatTotalDuration(3599)).toBe('59m');
    });

    it('formats hours and minutes', () => {
        expect(formatTotalDuration(3600)).toBe('1h');
        expect(formatTotalDuration(3660)).toBe('1h 1m');
        expect(formatTotalDuration(7320)).toBe('2h 2m');
    });

    it('omits minutes when exactly on the hour', () => {
        expect(formatTotalDuration(7200)).toBe('2h');
    });

    it('ignores remaining seconds', () => {
        expect(formatTotalDuration(3661)).toBe('1h 1m');
        expect(formatTotalDuration(90)).toBe('1m');
    });
});

describe('createProgressBar', () => {
    it('returns all bars when total is zero or negative', () => {
        const bar = createProgressBar(0, 0, 10);
        expect(bar).toBe('▬'.repeat(10));

        const bar2 = createProgressBar(5, -1, 10);
        expect(bar2).toBe('▬'.repeat(10));
    });

    it('places slider at start for zero progress', () => {
        const bar = createProgressBar(0, 100, 10);
        expect(bar).toBe('🔘' + '▬'.repeat(9));
        expect(bar.replace('🔘', '').length).toBe(9);
    });

    it('places slider at end for completed progress', () => {
        const bar = createProgressBar(100, 100, 10);
        expect(bar).toBe('▬'.repeat(9) + '🔘');
    });

    it('places slider proportionally for mid progress', () => {
        const bar = createProgressBar(50, 100, 10);
        expect(bar).toContain('🔘');
        // Total length should be (length - 1) bars + 1 slider
        const barChars = bar.replace('🔘', '');
        expect(barChars.length).toBe(9);
    });

    it('clamps progress above 100%', () => {
        const bar = createProgressBar(200, 100, 10);
        expect(bar).toBe('▬'.repeat(9) + '🔘');
    });

    it('uses default length of 20', () => {
        const bar = createProgressBar(0, 100);
        const barChars = bar.replace('🔘', '');
        expect(barChars.length).toBe(19);
    });
});
