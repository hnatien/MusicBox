import { describe, it, expect } from 'vitest';
import { formatDuration, formatRemainingDuration, createProgressBar } from './formatDuration.js';

describe('formatDuration', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatDuration(59)).toBe('0:59');
  });

  it('formats exactly one minute', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats exactly one hour', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('pads minutes to 2 digits when hours are present', () => {
    expect(formatDuration(3605)).toBe('1:00:05');
  });

  it('returns 0:00 for negative values', () => {
    expect(formatDuration(-10)).toBe('0:00');
  });

  it('returns 0:00 for Infinity', () => {
    expect(formatDuration(Infinity)).toBe('0:00');
  });

  it('returns 0:00 for NaN', () => {
    expect(formatDuration(NaN)).toBe('0:00');
  });

  it('floors fractional seconds', () => {
    expect(formatDuration(61.9)).toBe('1:01');
  });
});

describe('formatRemainingDuration', () => {
  it('returns negated remaining time', () => {
    expect(formatRemainingDuration(30, 120)).toBe('-1:30');
  });

  it('returns -0:00 when elapsed equals total', () => {
    expect(formatRemainingDuration(120, 120)).toBe('-0:00');
  });

  it('returns -0:00 when elapsed exceeds total', () => {
    expect(formatRemainingDuration(200, 120)).toBe('-0:00');
  });

  it('returns full duration when elapsed is 0', () => {
    expect(formatRemainingDuration(0, 90)).toBe('-1:30');
  });
});

describe('createProgressBar', () => {
  it('returns all dashes for zero total', () => {
    expect(createProgressBar(0, 0)).toBe('▬'.repeat(20));
  });

  it('returns all dashes for negative total', () => {
    expect(createProgressBar(50, -1)).toBe('▬'.repeat(20));
  });

  it('places slider at start when current is 0', () => {
    const bar = createProgressBar(0, 100);
    expect(bar.startsWith('🔘')).toBe(true);
  });

  it('places slider at end when current equals total', () => {
    const bar = createProgressBar(100, 100);
    expect(bar.endsWith('🔘')).toBe(true);
  });

  it('always contains exactly one slider emoji', () => {
    const bar = createProgressBar(50, 100);
    const count = [...bar].filter((c) => c === '🔘').length;
    expect(count).toBe(1);
  });

  it('contains length-1 dashes when slider is mid-bar', () => {
    // empty.slice(1) removes one dash to visually compensate for the emoji width
    const bar = createProgressBar(50, 100, 20);
    const dashCount = [...bar].filter((c) => c === '▬').length;
    expect(dashCount).toBe(19);
  });

  it('respects custom length (slider mid-bar)', () => {
    const bar = createProgressBar(50, 100, 10);
    const dashCount = [...bar].filter((c) => c === '▬').length;
    expect(dashCount).toBe(9);
  });

  it('clamps current above total to end position', () => {
    const barClamped = createProgressBar(200, 100);
    const barFull = createProgressBar(100, 100);
    expect(barClamped).toBe(barFull);
  });
});
