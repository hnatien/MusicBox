import { describe, it, expect } from 'vitest';
import { isValidYouTubeUrl, isPlaylistUrl, isMixUrl, sanitizeQuery } from '../../src/utils/validation.js';

describe('isValidYouTubeUrl', () => {
    it('accepts standard watch URLs', () => {
        expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
        expect(isValidYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
        expect(isValidYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts short URLs', () => {
        expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
        expect(isValidYouTubeUrl('http://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('accepts shorts URLs', () => {
        expect(isValidYouTubeUrl('https://www.youtube.com/shorts/abc123')).toBe(true);
    });

    it('accepts playlist URLs', () => {
        expect(isValidYouTubeUrl('https://www.youtube.com/playlist?list=PLxxxxxx')).toBe(true);
    });

    it('accepts YouTube Music URLs', () => {
        expect(isValidYouTubeUrl('https://music.youtube.com/watch?v=abc123')).toBe(true);
    });

    it('rejects non-YouTube URLs', () => {
        expect(isValidYouTubeUrl('https://vimeo.com/12345')).toBe(false);
        expect(isValidYouTubeUrl('https://spotify.com/track/123')).toBe(false);
        expect(isValidYouTubeUrl('hello world')).toBe(false);
        expect(isValidYouTubeUrl('')).toBe(false);
    });

    it('trims whitespace', () => {
        expect(isValidYouTubeUrl('  https://youtu.be/abc  ')).toBe(true);
    });

    it('accepts URLs without protocol', () => {
        expect(isValidYouTubeUrl('www.youtube.com/watch?v=abc')).toBe(true);
        expect(isValidYouTubeUrl('youtube.com/watch?v=abc')).toBe(true);
    });
});

describe('isPlaylistUrl', () => {
    it('detects playlist URLs', () => {
        expect(isPlaylistUrl('https://www.youtube.com/playlist?list=PLabcdef')).toBe(true);
    });

    it('rejects mix URLs (list=RD)', () => {
        expect(isPlaylistUrl('https://www.youtube.com/watch?v=abc&list=RDabc')).toBe(false);
    });

    it('rejects video URLs with list param', () => {
        expect(isPlaylistUrl('https://www.youtube.com/watch?v=abc&list=PLabc')).toBe(false);
    });

    it('rejects shorts with list param', () => {
        expect(isPlaylistUrl('https://www.youtube.com/shorts/abc?list=PLabc')).toBe(false);
    });

    it('rejects URLs without list param', () => {
        expect(isPlaylistUrl('https://www.youtube.com/watch?v=abc')).toBe(false);
    });
});

describe('isMixUrl', () => {
    it('detects mix URLs', () => {
        expect(isMixUrl('https://www.youtube.com/watch?v=abc&list=RDabc')).toBe(true);
        expect(isMixUrl('https://www.youtube.com/watch?v=abc&list=RDMMabc')).toBe(true);
    });

    it('rejects non-mix URLs', () => {
        expect(isMixUrl('https://www.youtube.com/watch?v=abc')).toBe(false);
        expect(isMixUrl('https://www.youtube.com/playlist?list=PLabc')).toBe(false);
    });

    it('trims whitespace', () => {
        expect(isMixUrl('  https://www.youtube.com/watch?v=abc&list=RDabc  ')).toBe(true);
    });
});

describe('sanitizeQuery', () => {
    it('trims whitespace', () => {
        expect(sanitizeQuery('  hello world  ')).toBe('hello world');
    });

    it('truncates to max length', () => {
        const long = 'a'.repeat(300);
        expect(sanitizeQuery(long)).toBe('a'.repeat(200));
    });

    it('truncates to custom max length', () => {
        expect(sanitizeQuery('hello world', 5)).toBe('hello');
    });

    it('returns empty string for empty input', () => {
        expect(sanitizeQuery('')).toBe('');
        expect(sanitizeQuery('   ')).toBe('');
    });
});
